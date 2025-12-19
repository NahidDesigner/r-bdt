import { pool } from "../server/db";

async function safeDbPush() {
  try {
    console.log("Checking for existing enum types...");

    // Check which enums already exist
    const enumCheck = await pool.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typname IN ('user_role', 'tenant_status', 'product_status', 'order_status')
    `);

    const existingEnums = enumCheck.rows.map((row) => row.typname);
    console.log(`Found existing enums: ${existingEnums.join(", ") || "none"}`);

    // If all enums exist, we can safely use --force
    // Otherwise, we'll let drizzle-kit create the missing ones
    if (existingEnums.length === 4) {
      console.log("All enums already exist. Using --force flag to skip enum creation...");
      const { execSync } = await import("child_process");
      execSync("drizzle-kit push --force", { stdio: "inherit" });
    } else {
      console.log("Some enums are missing. Running normal push...");
      const { execSync } = await import("child_process");
      execSync("drizzle-kit push", { stdio: "inherit" });
    }

    console.log("✅ Database migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

safeDbPush();

