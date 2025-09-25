namespace backend.Models;

public class Instructor
{
    public int Id { get; set; }
    public string Name { get; set; }
    public List<Session> Sessions { get; set; }
}