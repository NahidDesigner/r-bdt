# StoreBuilder BD - Multi-Tenant E-Commerce Platform

## Overview
A production-ready multi-tenant e-commerce platform for Bangladeshi traders with Cash on Delivery (COD) checkout, subdomain-based storefronts, shipping management, Facebook Pixel & Google Tag Manager integration, admin panel for platform management, and plan-based feature gating.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with bcrypt password hashing
- **Routing**: wouter (client-side), Express (server-side)

## Project Architecture

### Database Schema (shared/schema.ts)
- **Users**: Authentication with email/password, role (tenant/admin)
- **Tenants**: Stores/merchants with slug, plan, status
- **Plans**: Subscription plans with product limits, feature flags
- **Products**: Product catalog with images, pricing, status
- **Orders**: COD orders with customer info, shipping, status tracking
- **ShippingClasses**: Location-based shipping rates
- **StoreSettings**: FB Pixel, GTM, branding settings
- **DomainMappings**: Custom domain support (future)

### API Routes (server/routes.ts)
- `/api/auth/*` - Authentication (login, register, logout, me)
- `/api/dashboard/*` - Tenant dashboard stats
- `/api/products/*` - Product CRUD (tenant-protected)
- `/api/orders/*` - Order management (tenant-protected)
- `/api/shipping-classes/*` - Shipping configuration
- `/api/store-settings` - Store branding/tracking
- `/api/store/:slug/*` - Public storefront (COD checkout)
- `/api/admin/*` - Admin operations (admin-protected)

### Frontend Pages
- `/` - Landing page
- `/login`, `/register` - Authentication
- `/dashboard/*` - Tenant dashboard (products, orders, shipping, settings)
- `/admin/*` - Admin panel (tenants, plans management)
- `/store/:storeSlug/:productSlug` - Public product landing pages

## Key Features
1. **Multi-tenant Architecture**: Each trader gets their own store with unique slug
2. **Cash on Delivery**: Primary payment method for Bangladeshi market
3. **Mobile-First Design**: 80% of users browse on phones
4. **Tracking Integration**: Facebook Pixel & GTM for ad conversion tracking
5. **Plan-Based Gating**: Feature limits based on subscription plan
6. **Rate Limiting**: Auth (10/15min) and checkout (5/min) protection

## Design System
- **Fonts**: Inter (body), Plus Jakarta Sans (headings)
- **Colors**: Blue primary (#3b82f6), semantic shadcn tokens
- **Components**: shadcn/ui with custom theming
- **Guidelines**: See design_guidelines.md

## Running the Project
```bash
npm run dev        # Start development server on port 5000
npm run db:push    # Push schema changes to database
```

## Deployment Notes
- Path-based routing in development (`/store/:slug/:product`)
- Convert to subdomain routing for Coolify deployment
- SESSION_SECRET environment variable required in production
- Configure wildcard DNS for subdomain support

## Recent Changes
- 2024-12: Initial implementation with complete frontend/backend
- Added rate limiting for auth and checkout endpoints
- Implemented PostgreSQL session storage
- Added Facebook Pixel & GTM tracking support
