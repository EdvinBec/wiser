using System.Text;
using System.Text.Json.Serialization;
using backend.Infrastructure.Database;
using backend.Misc;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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

// Identity
builder.Services.AddIdentityCore<AppUser>(options =>
{
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>();

// JWT + Google auth
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = "Cookies"; // Google needs cookies for OAuth state
})
.AddCookie("Cookies")
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]
                ?? throw new InvalidOperationException("Jwt:Secret is not configured"))),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
    };
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Google:ClientId"]
        ?? throw new InvalidOperationException("Google:ClientId is not configured");
    options.ClientSecret = builder.Configuration["Google:ClientSecret"]
        ?? throw new InvalidOperationException("Google:ClientSecret is not configured");
    options.SignInScheme = "Cookies";
});

builder.Services.AddAuthorization();

// App services (check that singletons don't depend on scoped DbContext)
builder.Services.AddSingleton(new Logger("wiser.log"));
builder.Services.AddSingleton<ExcelFetcherService>();
builder.Services.AddSingleton<ExcelParserService>();
builder.Services.AddScoped<DatabaseService>();
builder.Services.AddScoped<TokenService>();
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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();