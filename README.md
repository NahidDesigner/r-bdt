# StoreBuilder BD - Multi-Tenant E-Commerce Platform

A production-ready multi-tenant e-commerce platform for Bangladeshi traders with Cash on Delivery (COD) checkout, subdomain-based storefronts, shipping management, Facebook Pixel & Google Tag Manager integration, admin panel for platform management, and plan-based feature gating.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with bcrypt password hashing
- **Storage**: AWS S3 or Replit Object Storage
- **Routing**: wouter (client-side), Express (server-side)

## Features

- ✅ Multi-tenant architecture with subdomain-based stores
- ✅ Cash on Delivery checkout
- ✅ Product management with image uploads
- ✅ Order management and tracking
- ✅ Shipping management with location-based rates
- ✅ Facebook Pixel & Google Tag Manager integration
- ✅ Email notifications for new orders
- ✅ Custom domain support with admin verification
- ✅ Admin panel for platform management
- ✅ Plan-based feature gating

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- AWS S3 bucket (or Replit storage for development)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd replit-bdt
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run db:push
```

5. Build the application:
```bash
npm run build
```

6. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for all available environment variables. Required variables:

- `SESSION_SECRET` - Random string for session encryption
- `DATABASE_URL` - PostgreSQL connection string
- `STORAGE_TYPE` - "s3" or "replit"
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` - If using S3

## Deployment on Coolify

### Prerequisites

1. A Coolify instance running
2. PostgreSQL database (can be provisioned in Coolify)
3. AWS S3 bucket or MinIO instance for file storage

### Deployment Steps

1. **Push your code to a Git repository** (GitHub, GitLab, etc.)

2. **In Coolify, create a new application:**
   - Click "New Resource" → "Application"
   - Connect your Git repository
   - Select the branch to deploy

3. **Configure Build Settings:**
   - Build Pack: **Nixpacks** (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Start Command: `npm start` (auto-detected)

4. **Set Environment Variables:**
   Add all required variables from `.env.example`:
   ```
   SESSION_SECRET=<generate-random-string>
   DATABASE_URL=postgresql://user:pass@host:port/db
   STORAGE_TYPE=s3
   S3_BUCKET=your-bucket
   S3_REGION=us-east-1
   S3_ACCESS_KEY_ID=your-key
   S3_SECRET_ACCESS_KEY=your-secret
   S3_PUBLIC_URL=https://your-bucket.s3.region.amazonaws.com
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Application will be available at the provided URL

### S3 Storage Setup

1. **Create an S3 bucket** (or use MinIO)
2. **Configure bucket policy** for public read access (if needed):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```
3. **Create IAM user** with S3 access permissions
4. **Set CORS policy** to allow uploads from your domain

### Using MinIO Instead of AWS S3

If using MinIO or another S3-compatible service:

```
STORAGE_TYPE=s3
S3_ENDPOINT=https://your-minio-instance.com
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minio-access-key
S3_SECRET_ACCESS_KEY=minio-secret-key
S3_PUBLIC_URL=https://your-minio-instance.com/your-bucket
```

## Database Setup

The application uses Drizzle ORM with PostgreSQL. To push schema changes:

```bash
npm run db:push
```

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   └── lib/        # Utilities and auth
├── server/             # Express backend
│   ├── routes.ts       # API routes
│   ├── storage.ts      # Database operations
│   └── replit_integrations/ # Storage adapters
├── shared/             # Shared types and schemas
│   └── schema.ts       # Database schema
└── script/            # Build scripts
```

## API Endpoints

- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - User login
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/orders` - List orders
- `POST /api/store/:storeSlug/orders` - Create order (public)
- `GET /api/store/:storeSlug` - Get store data (public)

See `server/routes.ts` for complete API documentation.

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Type check
npm run check

# Build for production
npm run build

# Run production build
npm start
```

## License

MIT

