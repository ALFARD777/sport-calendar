namespace SportCalendar.Api.Contracts;

public sealed record CreateExerciseRequest(
    string Date,
    string Type,
    string? Title,
    decimal Target);

public sealed record UpdateExerciseProgressRequest(decimal Progress);

public sealed record ExerciseResponse(
    Guid Id,
    string Date,
    string Type,
    string Title,
    decimal Target,
    decimal Progress);

public sealed record DailyExerciseSummaryResponse(
    string Date,
    int TotalExercises,
    int PlannedExercises,
    int InProgressExercises,
    int DoneExercises,
    int SkippedExercises);
