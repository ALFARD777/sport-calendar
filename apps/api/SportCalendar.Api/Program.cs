using SportCalendar.Api.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();

app.UseApiPipeline();
await app.ApplyMigrationsAsync();
app.MapApiEndpoints();

app.Run();
