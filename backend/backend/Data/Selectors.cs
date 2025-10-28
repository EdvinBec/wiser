namespace backend.Data;

public static class Selectors
{
    public static readonly Dictionary<string, string> Course2CodeMap = new()
    {
        { "BV20", "RIT 2" }
    };

    public static readonly Dictionary<string, int> Course2GradeMap = new()
    {
        { "BV20", 2 }
    };

    public static readonly Dictionary<string, string> CourseMap = new()
    {
        { "BV20", "_7" }
    };
}