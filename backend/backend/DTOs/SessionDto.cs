using backend.Models.Enums;

namespace backend.DTOs;

public class SessionDto
{
    public int Id { get; set; }
    
    public int ClassId { get; set; }
    public string ClassName { get; set; }

    public int InstructorId { get; set; }
    public string InstructorName { get; set; }

    public int RoomId { get; set; }
    public string RoomName { get; set; }
    
    public SessionType Type { get; set; }
    
    public int? GroupId { get; set; }
    public string? GroupName { get; set; }
    
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset FinishAt { get; set; }
}