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
