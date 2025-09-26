using backend.Infrastructure.Database.Configs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Database;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}
    
    public DbSet<Course> Courses { get; set; }
    public DbSet<Class> Classes { get; set; }
    public DbSet<Instructor> Instructors { get; set; }
    public DbSet<Room> Rooms { get; set; }
    public DbSet<Group> Groups { get; set; }
    public DbSet<Session> Sessions { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new SessionConfig());
        base.OnModelCreating(modelBuilder);
    }
}