namespace backend.Models;

public class Course
{
    public int Id { get; set; }
    public string Code { get; set; }
    public int Grade { get; set; }
    public DateTimeOffset LatestCheck { get; set; }
    public List<Session> Sessions { get; set; }
}