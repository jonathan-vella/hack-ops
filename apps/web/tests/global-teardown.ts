/**
 * Playwright global teardown: clean up test data, optionally stop container.
 */
import sql from "mssql";
import { teardownDatabase } from "./fixtures/teardown-db";
import { execSync } from "node:child_process";
import path from "node:path";

async function globalTeardown(): Promise<void> {
  try {
    const pool = await sql.connect({
      user: "sa",
      password: "Test@12345678",
      server: "localhost",
      port: 1433,
      database: "hackops_test",
      options: { encrypt: false, trustServerCertificate: true },
    });

    await teardownDatabase(pool);
    await pool.close();
  } catch {
    // Container may already be stopped; ignore
  }

  // Stop container unless KEEP_TEST_DB is set
  if (!process.env.KEEP_TEST_DB) {
    const repoRoot = path.resolve(__dirname, "../..");
    try {
      execSync("docker compose -f docker-compose.test.yml down", {
        cwd: repoRoot,
        stdio: "inherit",
      });
    } catch {
      // Ignore if already stopped
    }
  }
}

export default globalTeardown;
