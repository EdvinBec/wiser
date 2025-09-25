using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Infrastructure.Database.Configs;

public class SessionConfig : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> b)
    {
        b.ToTable("Sessions");

        b.HasKey(x => x.Id);

        b.HasOne(x => x.Course)
            .WithMany(c => c.Sessions)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Class)
            .WithMany(c => c.Sessions)
            .HasForeignKey(x => x.ClassId)
            .OnDelete(DeleteBehavior.Restrict);
        
        b.HasOne(x => x.Instructor)
            .WithMany(i => i.Sessions)
            .HasForeignKey(x => x.InstructorId)
            .OnDelete(DeleteBehavior.Restrict);
        
        b.HasOne(x => x.Room)
            .WithMany(r => r.Sessions)
            .HasForeignKey(x => x.RoomId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.GroupName)
            .HasMaxLength(32);

        b.Property(x => x.Type)
            .HasConversion<int>();

        b.HasIndex(x => new { x.CourseId, x.ClassId, x.StartAt });
        b.HasIndex(x => x.InstructorId);
        b.HasIndex(x => x.RoomId);
    }
}