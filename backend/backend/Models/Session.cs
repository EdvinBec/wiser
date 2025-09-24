using backend.Models.Enums;

namespace backend.Models;

public class Session
{
    public int Id { get; set; }
    public Course Course { get; set; }
    public Class Class { get; set; }
    public Instructor Instructor { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime FinishAt { get; set; }
    public SessionType Type { get; set; }
    public string GroupName { get; set; }
}