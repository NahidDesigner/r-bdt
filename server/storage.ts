import { db } from "./db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  users,
  tenants,
  plans,
  products,
  orders,
  shippingClasses,
  storeSettings,
  domainMappings,
  type User,
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Plan,
  type InsertPlan,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type ShippingClass,
  type InsertShippingClass,
  type StoreSettings,
  type InsertStoreSettings,
  type DomainMapping,
  type InsertDomainMapping,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithTenant(id: string): Promise<(User & { tenant?: Tenant & { plan?: Plan; storeSettings?: StoreSettings } }) | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  getAllTenants(): Promise<(Tenant & { plan?: Plan; _count?: { products: number; orders: number } })[]>;
  checkSlugAvailability(slug: string): Promise<boolean>;

  // Plans
  getPlan(id: string): Promise<Plan | undefined>;
  getAllPlans(): Promise<Plan[]>;
  getActivePlans(): Promise<Plan[]>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<void>;

  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySlug(tenantId: string, slug: string): Promise<Product | undefined>;
  getProductsByTenant(tenantId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  countProductsByTenant(tenantId: string): Promise<number>;

  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByTenant(tenantId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  getOrderStats(tenantId: string): Promise<{ totalOrders: number; newOrders: number; totalRevenue: string }>;

  // Shipping Classes
  getShippingClass(id: string): Promise<ShippingClass | undefined>;
  getShippingClassesByTenant(tenantId: string): Promise<ShippingClass[]>;
  createShippingClass(shippingClass: InsertShippingClass): Promise<ShippingClass>;
  updateShippingClass(id: string, data: Partial<InsertShippingClass>): Promise<ShippingClass | undefined>;
  deleteShippingClass(id: string): Promise<void>;

  // Store Settings
  getStoreSettings(tenantId: string): Promise<StoreSettings | undefined>;
  upsertStoreSettings(settings: InsertStoreSettings): Promise<StoreSettings>;

  // Admin Stats
  getAdminStats(): Promise<{ totalTenants: number; activeTenants: number; totalOrders: number; totalRevenue: string }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserWithTenant(id: string): Promise<(User & { tenant?: Tenant & { plan?: Plan; storeSettings?: StoreSettings } }) | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        tenant: {
          with: {
            plan: true,
            storeSettings: true,
          },
        },
      },
    });
    return result;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    return updated;
  }

  async getAllTenants(): Promise<(Tenant & { plan?: Plan; _count?: { products: number; orders: number } })[]> {
    const result = await db.query.tenants.findMany({
      with: { plan: true },
      orderBy: desc(tenants.createdAt),
    });

    const tenantsWithCounts = await Promise.all(
      result.map(async (tenant) => {
        const [productCount] = await db
          .select({ count: count() })
          .from(products)
          .where(eq(products.tenantId, tenant.id));
        const [orderCount] = await db
          .select({ count: count() })
          .from(orders)
          .where(eq(orders.tenantId, tenant.id));
        return {
          ...tenant,
          _count: {
            products: productCount?.count || 0,
            orders: orderCount?.count || 0,
          },
        };
      })
    );

    return tenantsWithCounts;
  }

  async checkSlugAvailability(slug: string): Promise<boolean> {
    const existing = await this.getTenantBySlug(slug);
    return !existing;
  }

  // Plans
  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async getAllPlans(): Promise<Plan[]> {
    return db.select().from(plans).orderBy(plans.price);
  }

  async getActivePlans(): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.price);
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [newPlan] = await db.insert(plans).values(plan).returning();
    return newPlan;
  }

  async updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan | undefined> {
    const [updated] = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return updated;
  }

  async deletePlan(id: string): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  }

  // Products
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductBySlug(tenantId: string, slug: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.slug, slug)));
    return product;
  }

  async getProductsByTenant(tenantId: string): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(desc(products.createdAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async countProductsByTenant(tenantId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.tenantId, tenantId));
    return result?.count || 0;
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByTenant(tenantId: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ status: status as any })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async getOrderStats(tenantId: string): Promise<{ totalOrders: number; newOrders: number; totalRevenue: string }> {
    const allOrders = await db.select().from(orders).where(eq(orders.tenantId, tenantId));

    const totalOrders = allOrders.length;
    const newOrders = allOrders.filter((o) => o.status === "new").length;
    const totalRevenue = allOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + parseFloat(o.total), 0)
      .toFixed(2);

    return { totalOrders, newOrders, totalRevenue };
  }

  // Shipping Classes
  async getShippingClass(id: string): Promise<ShippingClass | undefined> {
    const [sc] = await db.select().from(shippingClasses).where(eq(shippingClasses.id, id));
    return sc;
  }

  async getShippingClassesByTenant(tenantId: string): Promise<ShippingClass[]> {
    return db.select().from(shippingClasses).where(eq(shippingClasses.tenantId, tenantId));
  }

  async createShippingClass(shippingClass: InsertShippingClass): Promise<ShippingClass> {
    const [newSc] = await db.insert(shippingClasses).values(shippingClass).returning();
    return newSc;
  }

  async updateShippingClass(id: string, data: Partial<InsertShippingClass>): Promise<ShippingClass | undefined> {
    const [updated] = await db.update(shippingClasses).set(data).where(eq(shippingClasses.id, id)).returning();
    return updated;
  }

  async deleteShippingClass(id: string): Promise<void> {
    await db.delete(shippingClasses).where(eq(shippingClasses.id, id));
  }

  // Store Settings
  async getStoreSettings(tenantId: string): Promise<StoreSettings | undefined> {
    const [settings] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.tenantId, tenantId));
    return settings;
  }

  async upsertStoreSettings(settings: InsertStoreSettings): Promise<StoreSettings> {
    const existing = await this.getStoreSettings(settings.tenantId);
    if (existing) {
      const [updated] = await db
        .update(storeSettings)
        .set(settings)
        .where(eq(storeSettings.tenantId, settings.tenantId))
        .returning();
      return updated;
    }
    const [newSettings] = await db.insert(storeSettings).values(settings).returning();
    return newSettings;
  }

  // Admin Stats
  async getAdminStats(): Promise<{ totalTenants: number; activeTenants: number; totalOrders: number; totalRevenue: string }> {
    const allTenants = await db.select().from(tenants);
    const allOrders = await db.select().from(orders);

    const totalTenants = allTenants.length;
    const activeTenants = allTenants.filter((t) => t.status === "active").length;
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + parseFloat(o.total), 0)
      .toFixed(2);

    return { totalTenants, activeTenants, totalOrders, totalRevenue };
  }
}

export const storage = new DatabaseStorage();
