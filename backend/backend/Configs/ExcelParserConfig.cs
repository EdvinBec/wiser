using System.Text.RegularExpressions;

namespace backend.Configs;

public static class ExcelParserConfig
{
    public static int headerRowNumber = 0;
    public static int cellsCount = 7;
    public static int startColumnNumber = 1;
    public static int globalGroupRowNumber = 3;
    public static int globalGroupCellNumber = 3;

    public static string dateFormat = "dd.MM.yyyy HH:mm";

    public static List<string> daysInWeek = new List<string> { "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja" };
    
    public static string NormalizeSpaces(string s) => Regex.Replace(s.Trim(), @"\s+", " ");

}