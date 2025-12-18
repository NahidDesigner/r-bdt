import { hash } from "bcrypt";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function createAdmin() {
  const email = "nahidwebdesigner@gmail.com";
  const password = "admin123";

  try {
    // Check if admin already exists
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    
    if (existing) {
      // Update existing user to admin
      if (existing.role !== "admin") {
        await db
          .update(users)
          .set({ role: "admin", tenantId: null })
          .where(eq(users.id, existing.id));
        console.log(`✅ Updated user ${email} to admin role`);
      } else {
        // Update password
        const hashedPassword = await hash(password, 10);
        await db
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, existing.id));
        console.log(`✅ Updated admin password for ${email}`);
      }
    } else {
      // Create new admin user
      const hashedPassword = await hash(password, 10);
      await db.insert(users).values({
        email,
        password: hashedPassword,
        role: "admin",
        tenantId: null,
      });
      console.log(`✅ Created admin account: ${email}`);
    }
    
    console.log("\n📧 Admin Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("\n✅ Admin account setup complete!");
  } catch (error) {
    console.error("❌ Error creating admin account:", error);
    process.exit(1);
  }
}

createAdmin();

