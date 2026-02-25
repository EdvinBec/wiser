namespace backend.Models;

public class Course
{
    public int Id { get; set; }
    public string Code { get; set; }
    public int Grade { get; set; }
    public string Project { get; set; } = string.Empty; // VP1 or VP2
    public DateTimeOffset LatestCheck { get; set; }
    public List<Session> Sessions { get; set; }
}