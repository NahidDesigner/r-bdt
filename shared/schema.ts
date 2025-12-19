import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["tenant", "admin"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended", "pending"]);
export const productStatusEnum = pgEnum("product_status", ["active", "draft", "archived"]);
export const orderStatusEnum = pgEnum("order_status", ["new", "confirmed", "shipped", "delivered", "cancelled"]);

// Plans table - subscription plans for tenants
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  productLimit: integer("product_limit").notNull().default(5),
  allowCustomDomain: boolean("allow_custom_domain").notNull().default(false),
  allowTracking: boolean("allow_tracking").notNull().default(true),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tenants table - stores/merchants
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  planId: varchar("plan_id").references(() => plans.id),
  status: tenantStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Users table - authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("tenant"),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  status: productStatusEnum("status").notNull().default("draft"),
  hasVariants: boolean("has_variants").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Product Variants table
export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Small - Red", "Large - Blue"
  sku: text("sku"), // Optional SKU
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Variant-specific price
  stock: integer("stock").notNull().default(0), // Stock quantity
  attributes: text("attributes").notNull().default("{}"), // JSON string for size, color, etc.
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Shipping Classes table
export const shippingClasses = pgTable("shipping_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  location: text("location").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  variantId: varchar("variant_id").references(() => productVariants.id), // Optional variant reference
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  quantity: integer("quantity").notNull().default(1),
  shippingClassId: varchar("shipping_class_id").references(() => shippingClasses.id),
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Store Settings table
export const storeSettings = pgTable("store_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().unique().references(() => tenants.id),
  fbPixelId: text("fb_pixel_id"),
  gtmId: text("gtm_id"),
  storeLogo: text("store_logo"),
  primaryColor: text("primary_color").default("#3b82f6"),
  whatsappNumber: text("whatsapp_number"),
  contactEmail: text("contact_email"),
});

// Domain Mappings table (for custom domains)
export const domainMappings = pgTable("domain_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  domain: text("domain").notNull().unique(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const plansRelations = relations(plans, ({ many }) => ({
  tenants: many(tenants),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  plan: one(plans, { fields: [tenants.planId], references: [plans.id] }),
  users: many(users),
  products: many(products),
  orders: many(orders),
  shippingClasses: many(shippingClasses),
  storeSettings: one(storeSettings),
  domainMappings: many(domainMappings),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  orders: many(orders),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  orders: many(orders),
}));

export const shippingClassesRelations = relations(shippingClasses, ({ one }) => ({
  tenant: one(tenants, { fields: [shippingClasses.tenantId], references: [tenants.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  tenant: one(tenants, { fields: [orders.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [orders.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orders.variantId], references: [productVariants.id] }),
  shippingClass: one(shippingClasses, { fields: [orders.shippingClassId], references: [shippingClasses.id] }),
}));

export const storeSettingsRelations = relations(storeSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [storeSettings.tenantId], references: [tenants.id] }),
}));

export const domainMappingsRelations = relations(domainMappings, ({ one }) => ({
  tenant: one(tenants, { fields: [domainMappings.tenantId], references: [tenants.id] }),
}));

// Insert Schemas
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, createdAt: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertProductVariantSchema = createInsertSchema(productVariants).omit({ id: true, createdAt: true });
export const insertShippingClassSchema = createInsertSchema(shippingClasses).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertStoreSettingsSchema = createInsertSchema(storeSettings).omit({ id: true });
export const insertDomainMappingSchema = createInsertSchema(domainMappings).omit({ id: true, createdAt: true });

// Types
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ShippingClass = typeof shippingClasses.$inferSelect;
export type InsertShippingClass = z.infer<typeof insertShippingClassSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type DomainMapping = typeof domainMappings.$inferSelect;
export type InsertDomainMapping = z.infer<typeof insertDomainMappingSchema>;

// Validation schemas for forms
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  storeName: z.string().min(2, "Store name must be at least 2 characters"),
  storeSlug: z.string().min(2, "Store slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().refine(
    (val) => {
      // Remove +880 prefix if present, then check if it's a valid Bangladeshi number
      const cleaned = val.replace(/^\+880/, "").replace(/^880/, "").replace(/^0/, "");
      // Should be 10 digits starting with 1, then 3-9
      return /^1[3-9]\d{8}$/.test(cleaned);
    },
    { message: "Invalid Bangladeshi phone number. Use format: 01XXXXXXXXX or +8801XXXXXXXXX" }
  ),
  address: z.string().min(10, "Please enter a complete address"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  shippingClassId: z.string().min(1, "Please select a shipping option"),
  variantId: z.string().optional(), // Optional variant ID
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
