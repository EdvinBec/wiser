using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Infrastructure.Database;
using backend.Misc;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using DotNetEnv;

// The .env lives at the repository root, next to docker-compose.yml, so that `docker compose up`
// and a local `dotnet run` read the SAME credentials. Env.Load() only looks in the working
// directory, which for `dotnet run` is backend/backend — so walk up until the file turns up.
LoadDotEnvFromAncestors();

var builder = WebApplication.CreateBuilder(args);

// OpenAPI (ASP.NET 8 style)
builder.Services.AddOpenApi();

// EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(ResolveConnectionString(builder.Configuration)));

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
;

// Google sign-in is OPTIONAL. Without credentials the application still starts and serves
// everyone who signs in with an email and password; only the Google button stops working.
// Refusing to boot over a missing optional integration turns a cosmetic gap into an outage,
// and this one has to be reconfigured every time the domain changes.
var googleClientId = builder.Configuration["Google:ClientId"];
var googleClientSecret = builder.Configuration["Google:ClientSecret"];
var googleConfigured = !string.IsNullOrWhiteSpace(googleClientId)
                       && !string.IsNullOrWhiteSpace(googleClientSecret);

if (googleConfigured)
{
    builder.Services.AddAuthentication().AddGoogle(options =>
{
    options.ClientId = googleClientId!;
    options.ClientSecret = googleClientSecret!;
    options.SignInScheme = "Cookies";

    // Google returns the avatar as a "picture" key in its userinfo JSON. The handler maps
    // sub, name, given_name, family_name, email and link — not that one — so the callback's
    // lookup for a "picture" claim found nothing and AvatarUrl was null for every account.
    // Lift it off the raw payload and add the claim the callback already reads.
    options.Events.OnCreatingTicket = context =>
    {
        if (context.User.TryGetProperty("picture", out var picture)
            && picture.ValueKind == JsonValueKind.String)
        {
            var url = picture.GetString();
            if (!string.IsNullOrWhiteSpace(url))
                context.Identity?.AddClaim(new Claim("picture", url));
        }
        return Task.CompletedTask;
    };

    // The correlation cookie guards the callback against replay, and losing it is fatal to
    // sign-in: the handler throws "Correlation failed" and Kestrel turns that into a 500 the
    // visitor can do nothing with. Its defaults are SameSite=None with
    // SecurePolicy=SameAsRequest, which is a trap behind a terminating tunnel — the moment the
    // app believes the request is http the cookie ships without Secure, and SameSite=None
    // without Secure is rejected by every current browser. Lax is sent on the top-level
    // navigation Google performs on the way back and does not depend on Secure at all, so
    // sign-in survives even if the scheme is ever misread again.
    options.CorrelationCookie.SameSite = SameSiteMode.Lax;
    options.CorrelationCookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;

    // Behind a terminating tunnel the app sees plain http, so the redirect_uri handed to
    // Google would come back as http:// and be rejected. Skipped in development, where the
    // address really is http://localhost and rewriting it breaks sign-in locally.
    options.Events.OnRedirectToAuthorizationEndpoint = context =>
    {
        var uri = builder.Environment.IsDevelopment()
            ? context.RedirectUri
            : context.RedirectUri.Replace("http://", "https://");
        context.Response.Redirect(uri);
        return Task.CompletedTask;
    };

    // Anything that goes wrong in the remote half of the handshake — a dropped correlation
    // cookie, a stale state, a user who took too long — used to escape as an unhandled
    // exception and a blank 500. Hand the visitor back to the app with a reason instead, so
    // they see a message and can try again.
    options.Events.OnRemoteFailure = context =>
    {
        var frontend = builder.Configuration["Frontend:Url"] ?? "http://localhost:5173";
        var reason = Uri.EscapeDataString(context.Failure?.Message ?? "unknown");
        context.Response.Redirect($"{frontend}/login/callback?error={reason}");
        context.HandleResponse();
        return Task.CompletedTask;
    };
});
}

builder.Services.AddAuthorization();

// App services
builder.Services.AddSingleton(new Logger("wiser.log"));
builder.Services.AddScoped<TokenService>();

// Wise Timetable published web layer. The frontend cannot call it directly (no CORS on /web/),
// so WiseClient proxies and caches it. gzip is not optional here: the picker pages are ~293 kB
// raw and ~21 kB compressed.
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<backend.Services.Wise.WiseClient>(client =>
    {
        client.BaseAddress = new Uri("https://wise-tt.com");
        client.Timeout = TimeSpan.FromSeconds(45);
        client.DefaultRequestHeaders.UserAgent.ParseAdd(
            Environment.GetEnvironmentVariable("WISE_USER_AGENT") ?? "wiser/1.0 (+https://github.com/wiser)");
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("sl");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate | DecompressionMethods.Brotli
    });

// Controllers + JSON enum as string
builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter())
    );

// Add Swagger services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS. In development any origin is allowed, because the frontend moves between localhost
// ports. In production only the site itself may call the API: Frontend__Url is already the
// canonical public origin, so there is no second place to keep it in step.
const string corsPolicy = "AppCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicy, policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            return;
        }

        var origin = builder.Configuration["Frontend:Url"]
            ?? throw new InvalidOperationException(
                "Frontend:Url must be set outside development; it is the only origin allowed to call this API.");

        policy.WithOrigins(origin.TrimEnd('/'))
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();   // runs `dotnet ef database update` equivalent
}

// Stack traces and the Swagger explorer are development-only. Left on in production they hand
// an anonymous visitor the exception detail and the full API surface.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.RoutePrefix = string.Empty; // Swagger UI at http://localhost:5013/
    });
}

var forwardedOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedOptions.KnownNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);

app.UseCors(corsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();


/// <summary>
/// Finds the repository-root .env and loads it. Walking up matters because the file sits beside
/// docker-compose.yml while `dotnet run` starts in backend/backend, and both runtimes must end up
/// with the same database credentials rather than two copies that drift apart.
/// </summary>
static void LoadDotEnvFromAncestors()
{
    var dir = new DirectoryInfo(Directory.GetCurrentDirectory());

    while (dir != null)
    {
        var candidate = Path.Combine(dir.FullName, ".env");
        if (File.Exists(candidate))
        {
            Env.Load(candidate);
            return;
        }
        dir = dir.Parent;
    }
    // No .env is normal in a container, where the orchestrator injects the variables directly.
}

/// <summary>
/// Builds the Npgsql connection string, in the order a deployment actually overrides things:
///
///   1. DB_CONNECTION_STRING  — what docker-compose injects, a complete string.
///   2. POSTGRES_* from .env  — the same variables the database container is created with, so
///                              local development cannot drift from what the container expects.
///   3. ConnectionStrings:DefaultConnection — appsettings, for a host that configures it there.
///
/// Note the host/port split: inside compose the backend reaches the database at "database:5432"
/// on the private network, while a local `dotnet run` reaches the PUBLISHED port on 127.0.0.1.
/// POSTGRES_HOST and POSTGRES_PORT carry that difference, and nothing else has to change.
/// </summary>
static string ResolveConnectionString(IConfiguration configuration)
{
    var full = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
    if (!string.IsNullOrWhiteSpace(full)) return full;

    var user = Environment.GetEnvironmentVariable("POSTGRES_USER");
    var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD");
    var database = Environment.GetEnvironmentVariable("POSTGRES_DB");

    if (!string.IsNullOrWhiteSpace(user) &&
        !string.IsNullOrWhiteSpace(password) &&
        !string.IsNullOrWhiteSpace(database))
    {
        var host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "127.0.0.1";
        var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
        return $"Host={host};Port={port};Database={database};Username={user};Password={password};";
    }

    var fromSettings = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(fromSettings)) return fromSettings;

    throw new InvalidOperationException(
        "No database configuration found. Copy .env.example to .env at the repository root and " +
        "fill in POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB, or set DB_CONNECTION_STRING.");
}