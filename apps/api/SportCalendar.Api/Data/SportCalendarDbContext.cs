using Microsoft.EntityFrameworkCore;
using SportCalendar.Api.Domain;

namespace SportCalendar.Api.Data;

public sealed class SportCalendarDbContext(DbContextOptions<SportCalendarDbContext> options)
    : DbContext(options)
{
    public DbSet<Exercise> Exercises => Set<Exercise>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SportCalendarDbContext).Assembly);
    }
}
