using Microsoft.EntityFrameworkCore;
using SportCalendar.Api.Data;
using SportCalendar.Api.Endpoints;
using System.Data;

namespace SportCalendar.Api.Configuration;

public static class WebApplicationExtensions
{
    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        return app;
    }

    public static async Task ApplyMigrationsAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SportCalendarDbContext>();
        await BaselineInitialMigrationAsync(db);
        await db.Database.MigrateAsync();
    }

    public static WebApplication MapApiEndpoints(this WebApplication app)
    {
        app.MapHealthEndpoints();
        app.MapExerciseEndpoints();
        return app;
    }

    private static async Task BaselineInitialMigrationAsync(SportCalendarDbContext db)
    {
        var pending = (await db.Database.GetPendingMigrationsAsync()).ToArray();
        if (pending.Length == 0)
        {
            return;
        }

        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToArray();
        if (applied.Length > 0)
        {
            return;
        }

        var firstPendingMigrationId = pending[0];

        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        await using var existsCommand = connection.CreateCommand();
        existsCommand.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'exercises'
            );
            """;

        var existsResult = await existsCommand.ExecuteScalarAsync();
        var exercisesTableExists = existsResult is bool b && b;
        if (!exercisesTableExists)
        {
            return;
        }

        await using var ensureHistoryCommand = connection.CreateCommand();
        ensureHistoryCommand.CommandText = """
            CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                "MigrationId" character varying(150) NOT NULL,
                "ProductVersion" character varying(32) NOT NULL,
                CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
            );
            """;
        await ensureHistoryCommand.ExecuteNonQueryAsync();

        await using var insertHistoryCommand = connection.CreateCommand();
        insertHistoryCommand.CommandText = """
            INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
            SELECT @migrationId, @productVersion
            WHERE NOT EXISTS (
                SELECT 1
                FROM "__EFMigrationsHistory"
                WHERE "MigrationId" = @migrationId
            );
            """;

        var migrationIdParameter = insertHistoryCommand.CreateParameter();
        migrationIdParameter.ParameterName = "@migrationId";
        migrationIdParameter.Value = firstPendingMigrationId;
        insertHistoryCommand.Parameters.Add(migrationIdParameter);

        var productVersionParameter = insertHistoryCommand.CreateParameter();
        productVersionParameter.ParameterName = "@productVersion";
        productVersionParameter.Value = typeof(DbContext).Assembly.GetName().Version?.ToString(3) ?? "8.0.11";
        insertHistoryCommand.Parameters.Add(productVersionParameter);

        await insertHistoryCommand.ExecuteNonQueryAsync();
    }
}
