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
        { "BV20", "_12" }
    };

    public static readonly Dictionary<string, string> Project2SelectorMap = new()
    {
        { "VP1", "0" },
        { "VP2", "1" }
    };

    // Course configurations to fetch
    public static readonly List<CourseConfig> CourseConfigs = new()
    {
        new CourseConfig { CourseCode = "BV20", Grade = 2, Project = "VP1", GroupName = "RIT 2" },
        new CourseConfig { CourseCode = "BV20", Grade = 2, Project = "VP2", GroupName = "RIT 2" }
    };

    public class CourseConfig
    {
        public string CourseCode { get; set; } = string.Empty;
        public int Grade { get; set; }
        public string Project { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
    }
}