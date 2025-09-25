namespace backend.Models;

public class Room
{
    public int Id { get; set; }
    public string Building { get; set; }
    public string Code { get; set; }
    public List<Session> Sessions { get; set; }
}