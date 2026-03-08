/**
 * Playwright global setup: start SQL container, run schema, seed data.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import sql from "mssql";
import fs from "node:fs";
import { seedDatabase } from "./fixtures/seed-db";

const SQL_CONFIG: sql.config = {
  user: "sa",
  password: "Test@12345678",
  server: "localhost",
  port: 1433,
  database: "master",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function waitForSql(
  maxRetries = 20,
  intervalMs = 3000,
): Promise<sql.ConnectionPool> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const pool = await sql.connect(SQL_CONFIG);
      await pool.request().query("SELECT 1");
      return pool;
    } catch {
      if (i === maxRetries - 1)
        throw new Error("SQL Server did not become ready");
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  throw new Error("SQL Server did not become ready");
}

async function globalSetup(): Promise<void> {
  const repoRoot = path.resolve(__dirname, "../..");

  // Start SQL container if not already running
  try {
    const result = execSync(
      "docker compose -f docker-compose.test.yml ps --status running --format json",
      { cwd: repoRoot, encoding: "utf-8" },
    );
    const running = result.trim().length > 0;
    if (!running) {
      execSync("docker compose -f docker-compose.test.yml up -d --wait", {
        cwd: repoRoot,
        stdio: "inherit",
      });
    }
  } catch {
    execSync("docker compose -f docker-compose.test.yml up -d --wait", {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }

  // Wait for SQL to accept connections
  const pool = await waitForSql();

  // Create database if it doesn't exist
  await pool.request().query(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'hackops_test')
      CREATE DATABASE hackops_test
  `);

  // Reconnect to the test database
  await pool.close();
  const testPool = await sql.connect({
    ...SQL_CONFIG,
    database: "hackops_test",
  });

  // Run schema DDL
  const schemaPath = path.resolve(__dirname, "../src/lib/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  // Split on GO-like boundaries and execute each statement
  // The schema uses CREATE TABLE which can run as a batch
  const statements = schemaSql
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    try {
      await testPool.request().query(stmt);
    } catch (err: unknown) {
      // Ignore "already exists" errors for idempotent re-runs
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("There is already an object named")) {
        throw err;
      }
    }
  }

  // Seed test data
  await seedDatabase(testPool);
  await testPool.close();

  // Set env var for the app to use the test database
  process.env.SQL_SERVER = "localhost";
  process.env.SQL_DATABASE = "hackops_test";
  process.env.SQL_USER = "sa";
  process.env.SQL_PASSWORD = "Test@12345678";
  process.env.SQL_ENCRYPT = "false";
}

export default globalSetup;
