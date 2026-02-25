namespace SportCalendar.Api.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", () => TypedResults.Ok(new { status = "ok" }))
            .WithName("Health")
            .WithOpenApi();

        return app;
    }
}
