using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class DropOrphanScraperTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

        // Left behind by the Excel-scraping era: created outside EF, never mapped to an entity,
        // and empty on every environment. IF EXISTS keeps this safe on a database that never had
        // them. There is no Down(): recreating tables nothing reads would be worse than useless.
        migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AvailableCourses"" CASCADE;");
        migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AvailableGrades"" CASCADE;");
        migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AvailableSmers"" CASCADE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
