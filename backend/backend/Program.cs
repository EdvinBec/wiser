using System.Text.Json.Serialization;
using backend.Infrastructure.Database;
using backend.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// OpenAPI (ASP.NET 8 style)
builder.Services.AddOpenApi();

// EF Core
builder.Services.AddDbContextPool<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// App services (check that singletons don't depend on scoped DbContext)
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

var app = builder.Build();

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

app.MapControllers();

app.Run();