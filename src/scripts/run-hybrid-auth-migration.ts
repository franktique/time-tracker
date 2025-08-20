import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { query } from "../lib/db";

// Load environment variables from .env.local
config({ path: join(__dirname, "../../.env.local") });

async function runHybridAuthMigration() {
  try {
    console.info("🚀 Running hybrid authentication migration...");

    // Debug: Check if DATABASE_URL is loaded
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      console.info("✅ Using remote database connection");
      console.info(
        "📝 Database URL loaded:",
        databaseUrl.substring(0, 50) + "..."
      );
    } else {
      console.info("⚠️  No DATABASE_URL found, falling back to local config");
      console.info("📝 Using host:", process.env.DB_HOST || "localhost");
    }

    // Read the migration SQL file
    const migrationPath = join(
      __dirname,
      "../lib/migrations/002_hybrid_auth.sql"
    );
    const migrationSQL = readFileSync(migrationPath, "utf8");

    // Execute the migration
    await query(migrationSQL);

    console.info("✅ Hybrid authentication migration completed successfully!");

    // Verify the changes
    const result = await query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);

    console.info("\n📋 Updated users table schema:");
    result.rows.forEach((row: any) => {
      console.info(
        `  - ${row.column_name}: ${row.data_type} (${
          row.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });

    // Check indexes
    const indexes = await query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname LIKE '%cognito%';
    `);

    console.info("\n🔍 Cognito-related indexes:");
    indexes.rows.forEach((row: any) => {
      console.info(`  - ${row.indexname}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  runHybridAuthMigration();
}
