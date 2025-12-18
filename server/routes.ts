import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { hash, compare } from "bcrypt";
import { z } from "zod";
import { registerSchema, loginSchema, checkoutSchema } from "@shared/schema";
import pgSession from "connect-pg-simple";
import { pool } from "./db";
import { sendNewOrderEmail } from "./email";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const PgSession = pgSession(session);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Too many orders, please wait a moment" },
  standardHeaders: true,
  legacyHeaders: false,
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUserWithTenant(req.session.userId);
  if (!user || user.role !== "tenant" || !user.tenantId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  (req as any).user = user;
  (req as any).tenantId = user.tenantId;
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Trust proxy for production (Replit runs behind a proxy)
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Create user_sessions table if it doesn't exist
  // This fixes the issue where connect-pg-simple can't find table.sql in the dist folder
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
      )
      WITH (OIDS=FALSE);
      CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire");
    `);
    console.log("Session table created/verified successfully");
  } catch (error) {
    console.error("Error creating session table:", error);
    // Continue anyway - the table might already exist
  }

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: false, // We create it manually above
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // ==================== AUTH ROUTES ====================
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const slugAvailable = await storage.checkSlugAvailability(data.storeSlug);
      if (!slugAvailable) {
        return res.status(400).json({ message: "Store URL already taken" });
      }

      let freePlan = (await storage.getActivePlans())[0];
      
      // Create a default free plan if none exists
      if (!freePlan) {
        freePlan = await storage.createPlan({
          name: "Free",
          productLimit: 5,
          allowCustomDomain: false,
          allowTracking: true,
          price: "0",
          isActive: true,
        });
      }

      const tenant = await storage.createTenant({
        name: data.storeName,
        slug: data.storeSlug,
        planId: freePlan.id,
        status: "active",
      });

      const hashedPassword = await hash(data.password, 10);
      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        role: "tenant",
        tenantId: tenant.id,
      });

      await storage.upsertStoreSettings({
        tenantId: tenant.id,
        primaryColor: "#3b82f6",
      });

      await storage.createShippingClass({
        tenantId: tenant.id,
        name: "Inside Dhaka",
        location: "Dhaka City",
        fee: "60",
        isDefault: true,
      });

      await storage.createShippingClass({
        tenantId: tenant.id,
        name: "Outside Dhaka",
        location: "All other areas",
        fee: "120",
        isDefault: false,
      });

      req.session.userId = user.id;
      
      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Registration failed" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Registration error details:", errorMessage, error);
      res.status(500).json({ message: "Registration failed", error: errorMessage });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if tenant is suspended (only for tenant users)
      if (user.role === "tenant" && user.tenantId) {
        const tenant = await storage.getTenant(user.tenantId);
        if (tenant && tenant.status === "suspended") {
          return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
        }
      }

      req.session.userId = user.id;
      
      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Login error details:", errorMessage, error);
      res.status(500).json({ message: "Login failed", error: errorMessage });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUserWithTenant(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const { password, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // ==================== TENANT CHECK ROUTES ====================
  app.get("/api/tenants/check-slug", async (req, res) => {
    const slug = req.query.slug as string;
    if (!slug) {
      return res.status(400).json({ available: false });
    }
    const available = await storage.checkSlugAvailability(slug);
    res.json({ available });
  });

  // ==================== DASHBOARD ROUTES ====================
  app.get("/api/dashboard/stats", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const productCount = await storage.countProductsByTenant(tenantId);
      const orderStats = await storage.getOrderStats(tenantId);

      res.json({
        totalProducts: productCount,
        ...orderStats,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/dashboard/analytics", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const period = (req.query.period as "7d" | "30d" | "90d" | "all") || "30d";
      const analytics = await storage.getAnalytics(tenantId, period);
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ==================== PRODUCT ROUTES ====================
  app.get("/api/products", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const products = await storage.getProductsByTenant(tenantId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const user = (req as any).user;

      const productCount = await storage.countProductsByTenant(tenantId);
      const productLimit = user.tenant?.plan?.productLimit || 5;

      if (productCount >= productLimit) {
        return res.status(403).json({
          message: `Product limit reached (${productLimit}). Please upgrade your plan.`,
        });
      }

      const product = await storage.createProduct({
        ...req.body,
        tenantId,
      });
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", requireTenant, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product || product.tenantId !== (req as any).tenantId) {
        return res.status(404).json({ message: "Product not found" });
      }

      const updated = await storage.updateProduct(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", requireTenant, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product || product.tenantId !== (req as any).tenantId) {
        return res.status(404).json({ message: "Product not found" });
      }

      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // ==================== ORDER ROUTES ====================
  app.get("/api/orders", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const orders = await storage.getOrdersByTenant(tenantId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/orders/:id/status", requireTenant, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order || order.tenantId !== (req as any).tenantId) {
        return res.status(404).json({ message: "Order not found" });
      }

      const updated = await storage.updateOrderStatus(req.params.id, req.body.status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // ==================== SHIPPING CLASS ROUTES ====================
  app.get("/api/shipping-classes", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const classes = await storage.getShippingClassesByTenant(tenantId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shipping classes" });
    }
  });

  app.post("/api/shipping-classes", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const shippingClass = await storage.createShippingClass({
        ...req.body,
        tenantId,
      });
      res.json(shippingClass);
    } catch (error) {
      res.status(500).json({ message: "Failed to create shipping class" });
    }
  });

  app.patch("/api/shipping-classes/:id", requireTenant, async (req, res) => {
    try {
      const sc = await storage.getShippingClass(req.params.id);
      if (!sc || sc.tenantId !== (req as any).tenantId) {
        return res.status(404).json({ message: "Shipping class not found" });
      }

      const updated = await storage.updateShippingClass(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shipping class" });
    }
  });

  app.delete("/api/shipping-classes/:id", requireTenant, async (req, res) => {
    try {
      const sc = await storage.getShippingClass(req.params.id);
      if (!sc || sc.tenantId !== (req as any).tenantId) {
        return res.status(404).json({ message: "Shipping class not found" });
      }

      await storage.deleteShippingClass(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shipping class" });
    }
  });

  // ==================== STORE SETTINGS ROUTES ====================
  app.get("/api/store-settings", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const settings = await storage.getStoreSettings(tenantId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/store-settings", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const settings = await storage.upsertStoreSettings({
        ...req.body,
        tenantId,
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // ==================== PUBLIC STORE ROUTES ====================
  app.get("/api/store/:storeSlug", async (req, res) => {
    try {
      const { storeSlug } = req.params;

      const tenant = await storage.getTenantBySlug(storeSlug);
      if (!tenant || tenant.status !== "active") {
        return res.status(404).json({ message: "Store not found" });
      }

      const products = await storage.getProductsByTenant(tenant.id);
      const activeProducts = products.filter((p) => p.status === "active");
      const settings = await storage.getStoreSettings(tenant.id);

      res.json({
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        products: activeProducts,
        settings,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch store data" });
    }
  });

  app.get("/api/store/:storeSlug/product/:productSlug", async (req, res) => {
    try {
      const { storeSlug, productSlug } = req.params;

      const tenant = await storage.getTenantBySlug(storeSlug);
      if (!tenant || tenant.status !== "active") {
        return res.status(404).json({ message: "Store not found" });
      }

      const product = await storage.getProductBySlug(tenant.id, productSlug);
      if (!product || product.status !== "active") {
        return res.status(404).json({ message: "Product not found" });
      }

      const shippingClasses = await storage.getShippingClassesByTenant(tenant.id);
      const settings = await storage.getStoreSettings(tenant.id);

      res.json({
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        product,
        shippingClasses,
        settings,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch store data" });
    }
  });

  app.post("/api/store/:storeSlug/orders", checkoutLimiter, async (req, res) => {
    try {
      const { storeSlug } = req.params;

      const tenant = await storage.getTenantBySlug(storeSlug);
      if (!tenant || tenant.status !== "active") {
        return res.status(404).json({ message: "Store not found" });
      }

      const data = checkoutSchema.parse(req.body);
      const product = await storage.getProduct(req.body.productId);
      if (!product || product.tenantId !== tenant.id) {
        return res.status(404).json({ message: "Product not found" });
      }

      const shippingClass = await storage.getShippingClass(data.shippingClassId);
      if (!shippingClass || shippingClass.tenantId !== tenant.id) {
        return res.status(400).json({ message: "Invalid shipping option" });
      }

      const subtotal = parseFloat(product.price) * data.quantity;
      const shippingFee = parseFloat(shippingClass.fee);
      const total = subtotal + shippingFee;

      const order = await storage.createOrder({
        tenantId: tenant.id,
        productId: product.id,
        customerName: data.customerName,
        phone: data.phone,
        address: data.address,
        quantity: data.quantity,
        shippingClassId: data.shippingClassId,
        shippingFee: shippingFee.toFixed(2),
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        status: "new",
      });

      const storeSettings = await storage.getStoreSettings(tenant.id);
      if (storeSettings?.contactEmail) {
        sendNewOrderEmail({
          tenantEmail: storeSettings.contactEmail,
          tenantName: tenant.name,
          orderNumber: order.id.slice(-8).toUpperCase(),
          customerName: data.customerName,
          customerPhone: data.phone,
          customerAddress: data.address,
          productName: product.name,
          quantity: data.quantity,
          subtotal: subtotal.toFixed(2),
          shippingFee: shippingFee.toFixed(2),
          total: total.toFixed(2),
          shippingLocation: shippingClass.location,
        }).catch(console.error);
      }

      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Order error:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // ==================== ADMIN ROUTES ====================
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/recent-activity", requireAdmin, async (req, res) => {
    res.json([]);
  });

  app.get("/api/admin/tenants", requireAdmin, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.patch("/api/admin/tenants/:id/status", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateTenant(req.params.id, { status: req.body.status });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update tenant status" });
    }
  });

  app.patch("/api/admin/tenants/:id/plan", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateTenant(req.params.id, { planId: req.body.planId });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update tenant plan" });
    }
  });

  app.delete("/api/admin/tenants/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteTenant(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete tenant error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to delete tenant", error: errorMessage });
    }
  });

  app.get("/api/admin/plans", requireAdmin, async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post("/api/admin/plans", requireAdmin, async (req, res) => {
    try {
      const plan = await storage.createPlan(req.body);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  app.patch("/api/admin/plans/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updatePlan(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  app.delete("/api/admin/plans/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deletePlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });

  // ========== Domain Mappings (Tenant) ==========
  app.get("/api/domains", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const domains = await storage.getDomainMappingsByTenant(tenantId);
      res.json(domains);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domains" });
    }
  });

  app.post("/api/domains", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const user = (req as any).user;

      // Check if plan allows custom domains
      if (!user.tenant?.plan?.allowCustomDomain) {
        return res.status(403).json({ message: "Your plan does not support custom domains. Please upgrade." });
      }

      // Validate domain format
      const domainInput = req.body.domain?.trim()?.toLowerCase();
      if (!domainInput || domainInput.length < 4 || domainInput.length > 253) {
        return res.status(400).json({ message: "Invalid domain name length" });
      }

      // Basic hostname validation - allows subdomains like shop.example.com
      const hostnameRegex = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/;
      if (!hostnameRegex.test(domainInput)) {
        return res.status(400).json({ message: "Invalid domain format. Use format like shop.yourdomain.com" });
      }

      // Check if domain already exists
      const existing = await storage.getDomainMappingByDomain(domainInput);
      if (existing) {
        return res.status(400).json({ message: "This domain is already registered" });
      }

      const domain = await storage.createDomainMapping({
        tenantId,
        domain: domainInput,
      });
      res.json(domain);
    } catch (error) {
      res.status(500).json({ message: "Failed to add domain" });
    }
  });

  app.delete("/api/domains/:id", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const domain = await storage.getDomainMapping(req.params.id);
      
      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      await storage.deleteDomainMapping(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete domain" });
    }
  });

  app.post("/api/domains/:id/verify", requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const domain = await storage.getDomainMapping(req.params.id);
      
      if (!domain || domain.tenantId !== tenantId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      // In production, you would do DNS lookup to verify CNAME record points to your server
      // For now, we'll just mark it as verified after admin approval
      res.json({ message: "Verification request sent. Admin will review your domain." });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify domain" });
    }
  });

  // ========== Domain Mappings (Admin) ==========
  app.get("/api/admin/domains", requireAdmin, async (req, res) => {
    try {
      const domains = await storage.getAllDomainMappings();
      res.json(domains);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domains" });
    }
  });

  app.patch("/api/admin/domains/:id/verify", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateDomainMapping(req.params.id, { verified: true });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify domain" });
    }
  });

  app.patch("/api/admin/domains/:id/unverify", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateDomainMapping(req.params.id, { verified: false });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to unverify domain" });
    }
  });

  app.delete("/api/admin/domains/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteDomainMapping(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete domain" });
    }
  });

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  return httpServer;
}
