#!/usr/bin/env tsx

// Load environment variables from .env.local
import dotenv from "dotenv";
import path from "path";

// Load .env.local first (highest priority), then .env
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { runMigrations, checkDatabaseConnection } from "../lib/migrations";

async function main() {
  console.info("🔄 Starting database migration...");

  try {
    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error(
        "❌ Database connection failed. Please check your configuration."
      );
      process.exit(1);
    }

    // Run migrations
    await runMigrations();

    console.info("✅ Database migration completed successfully!");
    console.info("\nNext steps:");
    console.info("1. Start your development server: npm run dev");
    console.info("2. Register a new user account");
    console.info("3. Import your existing data using the migration tool");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
