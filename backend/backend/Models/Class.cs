namespace backend.Models;

public class Class
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int CourseId { get; set; }
    public List<Session> Sessions { get; set; }
}