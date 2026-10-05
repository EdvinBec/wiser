using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using DotNetEnv;

namespace backend.Infrastructure.Database;

/// <summary>
/// Used by `dotnet ef` at design time, never at runtime.
///
/// It resolves the connection the same way Program.cs does, and deliberately carries no fallback
/// credentials: a hardcoded password here would be a second source of truth that silently points
/// migrations at a different database than the application uses.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        LoadDotEnvFromAncestors();

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(ResolveConnectionString());

        return new AppDbContext(optionsBuilder.Options);
    }

    private static void LoadDotEnvFromAncestors()
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
    }

    private static string ResolveConnectionString()
    {
        var full = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(full)) return full;

        var user = Environment.GetEnvironmentVariable("POSTGRES_USER");
        var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD");
        var database = Environment.GetEnvironmentVariable("POSTGRES_DB");

        if (string.IsNullOrWhiteSpace(user) ||
            string.IsNullOrWhiteSpace(password) ||
            string.IsNullOrWhiteSpace(database))
        {
            throw new InvalidOperationException(
                "No database configuration found for design-time tooling. Fill in POSTGRES_USER, " +
                "POSTGRES_PASSWORD and POSTGRES_DB in the repository-root .env, or set " +
                "DB_CONNECTION_STRING.");
        }

        var host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "127.0.0.1";
        var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
        return $"Host={host};Port={port};Database={database};Username={user};Password={password};";
    }
}
