using backend.Models.Enums;

namespace backend.Models;

public class Session
{
    public int Id { get; set; }
    
    // Foreign keys
    public int CourseId { get; set; }
    public int ClassId { get; set; }
    public int InstructorId { get; set; }
    public int RoomId { get; set; }
    public int GroupId { get; set; }
    
    public Course Course { get; set; }
    public Class Class { get; set; }
    public Instructor Instructor { get; set; }
    public Room Room { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset FinishAt { get; set; }
    public SessionType Type { get; set; }
    public Group? Group { get; set; }
}