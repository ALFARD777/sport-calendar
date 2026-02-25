namespace SportCalendar.Api.Domain;

public enum ExerciseStatus
{
    Planned = 0,
    InProgress = 1,
    Done = 2,
    Skipped = 3
}

public static class ExerciseStatusResolver
{
    public static ExerciseStatus Resolve(DateOnly day, decimal progress, decimal target, DateOnly today)
    {
        if (progress >= target)
        {
            return ExerciseStatus.Done;
        }

        if (day < today)
        {
            return ExerciseStatus.Skipped;
        }

        if (progress <= 0)
        {
            return ExerciseStatus.Planned;
        }

        return ExerciseStatus.InProgress;
    }
}
