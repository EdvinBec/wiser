namespace backend.Models;

public class Group
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int CourseId { get; set; }
    public List<Session> Sessions { get; set; }
}