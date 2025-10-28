using System.Text.Json.Serialization;
using backend.Infrastructure.Database;
using backend.Misc;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;

// Load .env file if it exists
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// OpenAPI (ASP.NET 8 style)
builder.Services.AddOpenApi();

// EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
{
    // First try environment variable
    var envConn = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");

    // Fallback to appsettings.json if no env var
    var connStr = string.IsNullOrEmpty(envConn)
        ? builder.Configuration.GetConnectionString("DefaultConnection")
        : envConn;

    options.UseNpgsql(connStr);
});

// App services (check that singletons don't depend on scoped DbContext)
builder.Services.AddSingleton(new Logger("wiser.log"));
builder.Services.AddSingleton<ExcelFetcherService>();
builder.Services.AddSingleton<ExcelParserService>();
builder.Services.AddScoped<DatabaseService>();
builder.Services.AddHostedService<ExcelFetcherWorker>();

// Controllers + JSON enum as string
builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter())
    );

// Add Swagger services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy
            .AllowAnyOrigin() // your FE dev origin
            .AllowAnyHeader()
            .AllowAnyMethod();
        // If you send cookies/Authorization header:
        // .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();   // runs `dotnet ef database update` equivalent
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.RoutePrefix = string.Empty; // Swagger UI at http://localhost:5013/
    });
}

app.UseHttpsRedirection();

app.UseCors("DevCors");

app.MapControllers();

app.Run();