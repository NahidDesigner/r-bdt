import { pool } from "../server/db";

async function migrateVariants() {
  try {
    console.log("Starting Product Variants migration...");

    // Check if product_variants table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_variants'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      console.log("Creating product_variants table...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS product_variants (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          sku TEXT,
          price DECIMAL(10, 2) NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          attributes TEXT NOT NULL DEFAULT '{}',
          is_default BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("✅ product_variants table created");
    } else {
      console.log("✓ product_variants table already exists");
    }

    // Check if has_variants column exists in products table
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'has_variants'
      );
    `);

    const columnExists = columnCheck.rows[0].exists;

    if (!columnExists) {
      console.log("Adding has_variants column to products table...");
      await pool.query(`
        ALTER TABLE products 
        ADD COLUMN has_variants BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log("✅ has_variants column added");
    } else {
      console.log("✓ has_variants column already exists");
    }

    // Check if variant_id column exists in orders table
    const variantIdCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'variant_id'
      );
    `);

    const variantIdExists = variantIdCheck.rows[0].exists;

    if (!variantIdExists) {
      console.log("Adding variant_id column to orders table...");
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN variant_id VARCHAR REFERENCES product_variants(id);
      `);
      console.log("✅ variant_id column added");
    } else {
      console.log("✓ variant_id column already exists");
    }

    console.log("\n✅ Product Variants migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateVariants();

