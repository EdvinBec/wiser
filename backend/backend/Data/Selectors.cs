namespace backend.Data;

public static class Selectors
{
    public static readonly Dictionary<string, string> ButtonMap = new()
    {
        { "COURSE", "form\\:j_idt175" },
        { "GRADE", "form\\:j_idt179" },
        { "IZPISI", "form\\:j_idt238" },
        { "EXCEL", "reporstForm\\:j_idt729" }
    };
    
    public static readonly Dictionary<int, string> GradeMap = new()
    {
        { 1, "form\\:j_idt179_1" },
        { 2, "form\\:j_idt179_2" },
        { 3, "form\\:j_idt179_3" },
    };
    
    public static readonly Dictionary<string, string> CourseMap = new()
    {
        /*{ "BU10", "form\\:j_idt175_1" },
        { "BV10", "form\\:j_idt175_2" },
        { "BU80", "form\\:j_idt175_3" },
        { "BV30", "form\\:j_idt175_4" },
        { "BU50", "form\\:j_idt175_5" },
        { "BU20", "form\\:j_idt175_6" },*/
        { "BV20", "form\\:j_idt175_7" },
        /*{ "BU40", "form\\:j_idt175_8" },
        { "BU70", "form\\:j_idt175_9" },
        { "BV70", "form\\:j_idt175_10" },
        { "BMM7", "form\\:j_idt175_11" },
        { "BM10", "form\\:j_idt175_12" },
        { "BM80", "form\\:j_idt175_13" },
        { "BM50", "form\\:j_idt175_14" },
        { "BM20", "form\\:j_idt175_15" },
        { "BM40", "form\\:j_idt175_16" },
        { "ERASMUS", "form\\:j_idt175_17" },
        { "KOOD", "form\\:j_idt175_18" },
        { "DOKTORSKI", "form\\:j_idt175_19" }*/
    };
}