import { db } from "./db";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import {
  users,
  tenants,
  plans,
  products,
  productVariants,
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
  type ProductVariant,
  type InsertProductVariant,
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
  deleteTenant(id: string): Promise<void>;
  getAllTenants(): Promise<(Tenant & { plan?: Plan; _count?: { products: number; orders: number }; userEmail?: string; contactEmail?: string; phone?: string })[]>;
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
  bulkUpdateOrderStatus(ids: string[], status: string, tenantId: string): Promise<number>;
  getOrderStats(tenantId: string): Promise<{ totalOrders: number; newOrders: number; totalRevenue: string }>;
  getAnalytics(tenantId: string, period?: "7d" | "30d" | "90d" | "all"): Promise<{
    salesTrend: Array<{ date: string; revenue: number; orders: number }>;
    orderStatusBreakdown: Array<{ status: string; count: number; revenue: number }>;
    revenueTrend: Array<{ period: string; revenue: number; orders: number }>;
    topProducts: Array<{ productId: string; productName: string; orders: number; revenue: number }>;
    conversionRate: number;
  }>;

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

  // Domain Mappings
  getDomainMapping(id: string): Promise<DomainMapping | undefined>;
  getDomainMappingByDomain(domain: string): Promise<DomainMapping | undefined>;
  getDomainMappingsByTenant(tenantId: string): Promise<DomainMapping[]>;
  createDomainMapping(mapping: InsertDomainMapping): Promise<DomainMapping>;
  updateDomainMapping(id: string, data: Partial<InsertDomainMapping>): Promise<DomainMapping | undefined>;
  deleteDomainMapping(id: string): Promise<void>;
  getAllDomainMappings(): Promise<(DomainMapping & { tenant?: Tenant })[]>;
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
    if (!result) return undefined;
    return {
      ...result,
      tenant: result.tenant ? {
        ...result.tenant,
        plan: result.tenant.plan || undefined,
        storeSettings: result.tenant.storeSettings || undefined,
      } : undefined,
    };
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

  async getAllTenants(): Promise<(Tenant & { plan?: Plan; _count?: { products: number; orders: number }; userEmail?: string; contactEmail?: string; phone?: string })[]> {
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
        
        // Get user email for this tenant
        const [user] = await db.select().from(users).where(eq(users.tenantId, tenant.id)).limit(1);
        
        // Get store settings for contact email and phone
        const storeSettings = await this.getStoreSettings(tenant.id);
        
        return {
          ...tenant,
          plan: tenant.plan || undefined,
          _count: {
            products: productCount?.count || 0,
            orders: orderCount?.count || 0,
          },
          userEmail: user?.email,
          contactEmail: storeSettings?.contactEmail || undefined,
          phone: storeSettings?.whatsappNumber || undefined,
        };
      })
    );

    return tenantsWithCounts;
  }

  async deleteTenant(id: string): Promise<void> {
    // Delete related data in correct order to avoid foreign key constraint violations
    // 1. Orders (must be deleted before products and shipping classes)
    await db.delete(orders).where(eq(orders.tenantId, id));
    
    // 2. Products (referenced by orders)
    await db.delete(products).where(eq(products.tenantId, id));
    
    // 3. Shipping Classes (referenced by orders)
    await db.delete(shippingClasses).where(eq(shippingClasses.tenantId, id));
    
    // 4. Store Settings
    await db.delete(storeSettings).where(eq(storeSettings.tenantId, id));
    
    // 5. Domain Mappings
    await db.delete(domainMappings).where(eq(domainMappings.tenantId, id));
    
    // 6. Users
    await db.delete(users).where(eq(users.tenantId, id));
    
    // 7. Finally, delete the tenant itself
    await db.delete(tenants).where(eq(tenants.id, id));
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
    // Delete variants first (cascade should handle this, but being explicit)
    await this.deleteProductVariants(id);
    await db.delete(products).where(eq(products.id, id));
  }

  async countProductsByTenant(tenantId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.tenantId, tenantId));
    return result?.count || 0;
  }

  // Product Variants
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(desc(productVariants.isDefault), desc(productVariants.createdAt));
  }

  async getProductVariant(id: string): Promise<ProductVariant | undefined> {
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, id));
    return variant;
  }

  async createProductVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const [newVariant] = await db.insert(productVariants).values(variant).returning();
    return newVariant;
  }

  async updateProductVariant(id: string, data: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const [updated] = await db.update(productVariants).set(data).where(eq(productVariants.id, id)).returning();
    return updated;
  }

  async deleteProductVariant(id: string): Promise<void> {
    await db.delete(productVariants).where(eq(productVariants.id, id));
  }

  async deleteProductVariants(productId: string): Promise<void> {
    await db.delete(productVariants).where(eq(productVariants.productId, productId));
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

  async bulkUpdateOrderStatus(ids: string[], status: string, tenantId: string): Promise<number> {
    // Verify all orders belong to the tenant
    const allOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), inArray(orders.id, ids)));
    
    if (allOrders.length !== ids.length) {
      throw new Error("Some orders not found or don't belong to tenant");
    }

    const result = await db
      .update(orders)
      .set({ status: status as any })
      .where(and(eq(orders.tenantId, tenantId), inArray(orders.id, ids)))
      .returning();
    
    return result.length;
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

  async getAnalytics(tenantId: string, period: "7d" | "30d" | "90d" | "all" = "30d"): Promise<{
    salesTrend: Array<{ date: string; revenue: number; orders: number }>;
    orderStatusBreakdown: Array<{ status: string; count: number; revenue: number }>;
    revenueTrend: Array<{ period: string; revenue: number; orders: number }>;
    topProducts: Array<{ productId: string; productName: string; orders: number; revenue: number }>;
    conversionRate: number;
  }> {
    const allOrders = await db.select().from(orders).where(eq(orders.tenantId, tenantId));
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    const filteredOrders = allOrders.filter((o) => new Date(o.createdAt) >= startDate);
    
    // Sales Trend (daily)
    const salesTrendMap = new Map<string, { revenue: number; orders: number }>();
    filteredOrders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0];
      const existing = salesTrendMap.get(date) || { revenue: 0, orders: 0 };
      salesTrendMap.set(date, {
        revenue: existing.revenue + parseFloat(order.total),
        orders: existing.orders + 1,
      });
    });
    
    const salesTrend = Array.from(salesTrendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Order Status Breakdown
    const statusMap = new Map<string, { count: number; revenue: number }>();
    filteredOrders.forEach((order) => {
      const existing = statusMap.get(order.status) || { count: 0, revenue: 0 };
      statusMap.set(order.status, {
        count: existing.count + 1,
        revenue: existing.revenue + (order.status === "delivered" ? parseFloat(order.total) : 0),
      });
    });
    
    const orderStatusBreakdown = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      ...data,
    }));
    
    // Revenue Trend (weekly for 30d+, daily for 7d)
    const revenueTrendMap = new Map<string, { revenue: number; orders: number }>();
    filteredOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      let periodKey: string;
      
      if (period === "7d") {
        periodKey = orderDate.toISOString().split("T")[0];
      } else {
        // Weekly grouping
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay());
        periodKey = weekStart.toISOString().split("T")[0];
      }
      
      const existing = revenueTrendMap.get(periodKey) || { revenue: 0, orders: 0 };
      revenueTrendMap.set(periodKey, {
        revenue: existing.revenue + parseFloat(order.total),
        orders: existing.orders + 1,
      });
    });
    
    const revenueTrend = Array.from(revenueTrendMap.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
    
    // Top Products
    const productMap = new Map<string, { productName: string; orders: number; revenue: number }>();
    const productIds = new Set(filteredOrders.map((o) => o.productId));
    const productList = await db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId));
    
    const productNameMap = new Map(productList.map((p) => [p.id, p.name]));
    
    filteredOrders.forEach((order) => {
      const productName = productNameMap.get(order.productId) || "Unknown Product";
      const existing = productMap.get(order.productId) || {
        productName,
        orders: 0,
        revenue: 0,
      };
      productMap.set(order.productId, {
        productName,
        orders: existing.orders + 1,
        revenue: existing.revenue + parseFloat(order.total),
      });
    });
    
    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Conversion Rate (orders / total products viewed - simplified as orders / total orders for now)
    // In a real scenario, you'd track product views separately
    const totalOrders = filteredOrders.length;
    const deliveredOrders = filteredOrders.filter((o) => o.status === "delivered").length;
    const conversionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
    
    return {
      salesTrend,
      orderStatusBreakdown,
      revenueTrend,
      topProducts,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
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

  // Domain Mappings
  async getDomainMapping(id: string): Promise<DomainMapping | undefined> {
    const [mapping] = await db.select().from(domainMappings).where(eq(domainMappings.id, id));
    return mapping;
  }

  async getDomainMappingByDomain(domain: string): Promise<DomainMapping | undefined> {
    const [mapping] = await db.select().from(domainMappings).where(eq(domainMappings.domain, domain.toLowerCase()));
    return mapping;
  }

  async getDomainMappingsByTenant(tenantId: string): Promise<DomainMapping[]> {
    return db.select().from(domainMappings).where(eq(domainMappings.tenantId, tenantId));
  }

  async createDomainMapping(mapping: InsertDomainMapping): Promise<DomainMapping> {
    const [newMapping] = await db.insert(domainMappings).values({
      ...mapping,
      domain: mapping.domain.toLowerCase(),
    }).returning();
    return newMapping;
  }

  async updateDomainMapping(id: string, data: Partial<InsertDomainMapping>): Promise<DomainMapping | undefined> {
    const updateData = data.domain ? { ...data, domain: data.domain.toLowerCase() } : data;
    const [updated] = await db.update(domainMappings).set(updateData).where(eq(domainMappings.id, id)).returning();
    return updated;
  }

  async deleteDomainMapping(id: string): Promise<void> {
    await db.delete(domainMappings).where(eq(domainMappings.id, id));
  }

  async getAllDomainMappings(): Promise<(DomainMapping & { tenant?: Tenant })[]> {
    const result = await db.query.domainMappings.findMany({
      with: { tenant: true },
      orderBy: desc(domainMappings.createdAt),
    });
    return result;
  }
}

export const storage = new DatabaseStorage();
