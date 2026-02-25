using Microsoft.EntityFrameworkCore;
using SportCalendar.Api.Common;
using SportCalendar.Api.Contracts;
using SportCalendar.Api.Data;
using SportCalendar.Api.Domain;

namespace SportCalendar.Api.Endpoints;

public static class ExerciseEndpoints
{
    public static IEndpointRouteBuilder MapExerciseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/exercises")
            .WithTags("Exercises");

        group.MapGet("", GetExercises)
            .WithName("GetExercises")
            .WithOpenApi();

        group.MapGet("/daily-summary", GetDailySummary)
            .WithName("GetDailyExerciseSummary")
            .WithOpenApi();

        group.MapPost("", CreateExercise)
            .WithName("CreateExercise")
            .WithOpenApi();

        group.MapPatch("/{id:guid}/progress", UpdateExerciseProgress)
            .WithName("UpdateExerciseProgress")
            .WithOpenApi();

        return app;
    }

    private static async Task<IResult> GetExercises(
        string from,
        string to,
        SportCalendarDbContext db,
        CancellationToken cancellationToken)
    {
        if (!DateKey.TryParse(from, out var fromDate) || !DateKey.TryParse(to, out var toDate))
        {
            return TypedResults.BadRequest(new
            {
                message = "Use query params 'from' and 'to' in format YYYY-MM-DD.",
            });
        }

        if (fromDate > toDate)
        {
            return TypedResults.BadRequest(new
            {
                message = "'from' must be less than or equal to 'to'.",
            });
        }

        var exercises = await db.Exercises
            .AsNoTracking()
            .Where(x => x.Day >= fromDate && x.Day <= toDate)
            .OrderBy(x => x.Day)
            .ThenBy(x => x.CreatedAtUtc)
            .ThenBy(x => x.Id)
            .Select(x => ToResponse(x))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(exercises);
    }

    private static async Task<IResult> GetDailySummary(
        string from,
        string to,
        SportCalendarDbContext db,
        CancellationToken cancellationToken)
    {
        if (!DateKey.TryParse(from, out var fromDate) || !DateKey.TryParse(to, out var toDate))
        {
            return TypedResults.BadRequest(new
            {
                message = "Use query params 'from' and 'to' in format YYYY-MM-DD.",
            });
        }

        if (fromDate > toDate)
        {
            return TypedResults.BadRequest(new
            {
                message = "'from' must be less than or equal to 'to'.",
            });
        }

        var items = await db.Exercises
            .AsNoTracking()
            .Where(x => x.Day >= fromDate && x.Day <= toDate)
            .Select(x => new
            {
                x.Day,
                x.Target,
                x.Progress,
            })
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.Today);
        var summary = items
            .GroupBy(x => x.Day)
            .Select(group =>
            {
                var planned = 0;
                var inProgress = 0;
                var done = 0;
                var skipped = 0;

                foreach (var item in group)
                {
                    var status = ExerciseStatusResolver.Resolve(item.Day, item.Progress, item.Target, today);
                    switch (status)
                    {
                        case ExerciseStatus.Planned:
                            planned++;
                            break;
                        case ExerciseStatus.InProgress:
                            inProgress++;
                            break;
                        case ExerciseStatus.Done:
                            done++;
                            break;
                        case ExerciseStatus.Skipped:
                            skipped++;
                            break;
                    }
                }

                return new DailyExerciseSummaryResponse(
                    DateKey.Format(group.Key),
                    group.Count(),
                    planned,
                    inProgress,
                    done,
                    skipped);
            })
            .OrderBy(x => x.Date)
            .ToList();

        return TypedResults.Ok(summary);
    }

    private static async Task<IResult> CreateExercise(
        CreateExerciseRequest request,
        SportCalendarDbContext db,
        CancellationToken cancellationToken)
    {
        if (!DateKey.TryParse(request.Date, out var exerciseDate))
        {
            return TypedResults.BadRequest(new { message = "Field 'date' must have format YYYY-MM-DD." });
        }

        var normalizedType = request.Type.Trim().ToLowerInvariant();
        if (!AllowedExerciseTypes.Contains(normalizedType))
        {
            return TypedResults.BadRequest(new { message = "Unsupported activity type." });
        }

        if (request.Target <= 0)
        {
            return TypedResults.BadRequest(new { message = "Field 'target' must be greater than zero." });
        }

        var exercise = new Exercise
        {
            Id = Guid.NewGuid(),
            Day = exerciseDate,
            Type = normalizedType,
            Title = string.IsNullOrWhiteSpace(request.Title)
                ? $"{normalizedType} тренировка"
                : request.Title.Trim(),
            Target = request.Target,
            Progress = 0,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow,
        };

        db.Exercises.Add(exercise);
        await db.SaveChangesAsync(cancellationToken);

        var response = ToResponse(exercise);
        return TypedResults.Created($"/exercises/{response.Id}", response);
    }

    private static async Task<IResult> UpdateExerciseProgress(
        Guid id,
        UpdateExerciseProgressRequest request,
        SportCalendarDbContext db,
        CancellationToken cancellationToken)
    {
        if (request.Progress < 0)
        {
            return TypedResults.BadRequest(new
            {
                message = "Field 'progress' must be greater than or equal to zero.",
            });
        }

        var exercise = await db.Exercises.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (exercise is null)
        {
            return TypedResults.NotFound(new { message = "Exercise not found." });
        }

        exercise.Progress = Math.Clamp(request.Progress, 0m, exercise.Target);
        exercise.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToResponse(exercise));
    }

    private static ExerciseResponse ToResponse(Exercise exercise)
    {
        return new ExerciseResponse(
            exercise.Id,
            DateKey.Format(exercise.Day),
            exercise.Type,
            exercise.Title,
            exercise.Target,
            exercise.Progress);
    }

    private static readonly HashSet<string> AllowedExerciseTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "run",
        "bike",
        "swim",
        "yoga",
        "strength",
    };
}
