using Microsoft.EntityFrameworkCore;
using SportCalendar.Api.Data;

namespace SportCalendar.Api.Configuration;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (allowedOrigins.Length > 0)
        {
            services.AddCors(options =>
            {
                options.AddPolicy("WebClient", policy =>
                    policy.WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod());
            });
        }

        var connectionString = configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'ConnectionStrings:Postgres' is not configured.");
        }

        services.AddDbContext<SportCalendarDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }
}
