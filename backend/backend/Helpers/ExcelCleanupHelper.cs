using NPOI.SS.UserModel;
namespace backend.Helpers;

public class ExcelCleanupHelper
{

    static readonly MissingCellPolicy MCP = MissingCellPolicy.RETURN_NULL_AND_BLANK;

    static bool IsCellEmpty(ICell? c)
    {
        if (c == null) return true;
        return c.CellType switch
        {
            CellType.Blank => true,
            CellType.String => string.IsNullOrWhiteSpace(c.StringCellValue),
            CellType.Formula => c.CachedFormulaResultType == CellType.Blank ||
                                (c.CachedFormulaResultType == CellType.String &&
                                 string.IsNullOrWhiteSpace(c.StringCellValue)),
            _ => false // numeric/boolean/date/formula (non-blank) are considered non-empty
        };
    }

    public static List<int> FindCompletelyEmptyColumns(ISheet sheet, int fromRowInclusive = 0)
    {
        int lastRow = sheet.LastRowNum;
        int maxCol = 0;
        for (int r = sheet.FirstRowNum; r <= lastRow; r++)
            maxCol = Math.Max(maxCol, sheet.GetRow(r)?.LastCellNum ?? 0);

        var emptyCols = new List<int>();
        for (int col = 0; col < maxCol; col++)
        {
            // Count empty cells in column, if there is more than 10, consider it as empty
            int cntr = 0;
            for (int r = fromRowInclusive; r <= lastRow && cntr < 10; r++)
            {
                var row = sheet.GetRow(r);
                if (row == null) continue;
                var cell = row.GetCell(col, MCP);
                if (!IsCellEmpty(cell))
                {
                    cntr++;
                }
            }
            if (cntr < 10) emptyCols.Add(col);
        }
        return emptyCols;
    }

    public static void DeleteColumns(ISheet sheet, IEnumerable<int> colsToDelete)
    {
        var cols = colsToDelete.OrderByDescending(c => c).ToArray(); // delete right→left
        for (int r = sheet.FirstRowNum; r <= sheet.LastRowNum; r++)
        {
            var row = sheet.GetRow(r);
            if (row == null) continue;

            foreach (var col in cols)
            {
                // shift cells left starting at 'col'
                for (int c = col; c < (row.LastCellNum - 1); c++)
                {
                    var src = row.GetCell(c + 1, MCP);
                    var dst = row.GetCell(c, MCP);

                    if (src != null)
                    {
                        if (dst == null) dst = row.CreateCell(c, src.CellType);
                        CopyCell(src, dst);
                    }
                    else
                    {
                        if (dst != null) row.RemoveCell(dst);
                    }
                }
                // remove the last cell (now duplicated)
                var lastIdx = row.LastCellNum - 1;
                if (lastIdx >= 0)
                {
                    var lastCell = row.GetCell(lastIdx, MCP);
                    if (lastCell != null) row.RemoveCell(lastCell);
                }
            }
        }
    }

    static void CopyCell(ICell src, ICell dst)
    {
        dst.CellStyle  = src.CellStyle;
        dst.Hyperlink  = src.Hyperlink;
        dst.CellComment = src.CellComment;

        switch (src.CellType)
        {
            case CellType.Boolean: dst.SetCellValue(src.BooleanCellValue); break;
            case CellType.Numeric: dst.SetCellValue(src.NumericCellValue); break;
            case CellType.String:  dst.SetCellValue(src.StringCellValue);  break;
            case CellType.Formula: dst.SetCellFormula(src.CellFormula);    break;
            case CellType.Blank:   dst.SetCellType(CellType.Blank);        break;
            default:               dst.SetCellValue(src.ToString());       break;
        }
    }
}