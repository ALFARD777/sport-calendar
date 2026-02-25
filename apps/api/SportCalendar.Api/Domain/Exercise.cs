namespace SportCalendar.Api.Domain;

public sealed class Exercise
{
    public Guid Id { get; set; }
    public DateOnly Day { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public decimal Target { get; set; }
    public decimal Progress { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}
