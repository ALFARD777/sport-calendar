using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SportCalendar.Api.Domain;

namespace SportCalendar.Api.Data.Configurations;

public sealed class ExerciseConfiguration : IEntityTypeConfiguration<Exercise>
{
    public void Configure(EntityTypeBuilder<Exercise> builder)
    {
        builder.ToTable(
            "exercises",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint("ck_exercises_target_positive", "target > 0");
                tableBuilder.HasCheckConstraint("ck_exercises_progress_nonnegative", "progress >= 0");
            });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Day).HasColumnName("day");
        builder.Property(x => x.Type).HasColumnName("type").HasMaxLength(32);
        builder.Property(x => x.Title).HasColumnName("title").HasMaxLength(200);
        builder.Property(x => x.Target).HasColumnName("target").HasPrecision(10, 2);
        builder.Property(x => x.Progress).HasColumnName("progress").HasPrecision(10, 2);
        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .HasDefaultValueSql("NOW()");
        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc")
            .HasDefaultValueSql("NOW()");

        builder.HasIndex(x => x.Day).HasDatabaseName("idx_exercises_day");
    }
}
