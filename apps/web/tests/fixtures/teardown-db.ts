/**
 * Teardown: truncate all tables in reverse FK order.
 */
import sql from "mssql";

const TABLES_IN_FK_ORDER = [
  "audit_log",
  "progressions",
  "scores",
  "submissions",
  "rubric_pointers",
  "rubric_versions",
  "hackers",
  "challenges",
  "teams",
  "config",
  "roles",
  "hackathons",
];

export async function teardownDatabase(
  pool: sql.ConnectionPool,
): Promise<void> {
  for (const table of TABLES_IN_FK_ORDER) {
    await pool.request().query(`DELETE FROM ${table}`);
  }
}
