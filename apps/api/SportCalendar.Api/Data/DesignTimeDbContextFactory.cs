using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SportCalendar.Api.Data;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<SportCalendarDbContext>
{
    public SportCalendarDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'ConnectionStrings:Postgres' is not configured.");
        }

        var optionsBuilder = new DbContextOptionsBuilder<SportCalendarDbContext>();
        optionsBuilder.UseNpgsql(connectionString);
        return new SportCalendarDbContext(optionsBuilder.Options);
    }
}
