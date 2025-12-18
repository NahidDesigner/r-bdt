# Deployment Plan for Coolify with Nixpacks

## Overview
This plan outlines the steps needed to prepare the StoreBuilder BD app for deployment on Coolify using Nixpacks buildpack from a public Git repository.

## Issues to Fix

### 🔴 Critical Issues

#### 1. Object Storage - Replit Dependency
**Problem:** The app uses Replit's object storage service which won't work on Coolify.

**Solution:** Replace with S3-compatible storage (AWS S3 or MinIO)
- Create new storage service adapter
- Support both Replit (for development) and S3 (for production)
- Use environment variables to switch between providers

**Files to modify:**
- `server/replit_integrations/object_storage/objectStorage.ts`
- `server/replit_integrations/object_storage/routes.ts`
- Add new file: `server/storage/s3Storage.ts` (optional, can keep Google Cloud Storage with S3-compatible config)

**Environment variables needed:**
- `STORAGE_TYPE=s3` or `replit` (default to `s3` in production)
- `S3_ENDPOINT` (optional, for MinIO or custom S3)
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_URL` (base URL for serving files)

#### 2. Static File Path
**Problem:** Need to verify static file serving works correctly in production build.

**Solution:** The current setup should work (`dist/public`), but we'll verify and add error handling.

**Files to modify:**
- `server/static.ts` - Add better error messages and path verification

### 🟡 Medium Priority Issues

#### 3. Replit-Specific Vite Plugins
**Problem:** Replit plugins are in devDependencies but still imported in vite.config.ts

**Solution:** Already conditionally loaded, but we'll ensure they don't cause issues in production.

**Files to verify:**
- `vite.config.ts` - Already has conditional loading, should be fine

#### 4. Environment Variables Documentation
**Problem:** No clear documentation of required environment variables

**Solution:** Create `.env.example` and update documentation

**Files to create:**
- `.env.example` - Template with all required variables

### 🟢 Low Priority / Documentation

#### 5. README for Deployment
**Problem:** No deployment instructions

**Solution:** Create comprehensive README.md

**Files to create:**
- `README.md` - Full project documentation with deployment guide

#### 6. Build Verification
**Problem:** Need to ensure build process works correctly

**Solution:** Test locally before pushing

## Implementation Steps

### Phase 1: Object Storage Replacement (Critical)

1. **Update objectStorage.ts to support S3**
   - Add S3 configuration option
   - Keep Replit support for backward compatibility
   - Use environment variable to switch providers

2. **Update routes.ts**
   - Ensure error handling works for both providers
   - Add fallback if storage is not configured

3. **Test locally**
   - Test with S3 credentials
   - Test image upload flow

### Phase 2: Build & Static Files

1. **Verify static.ts path**
   - Ensure `dist/public` is correct
   - Add better error messages

2. **Test build process**
   ```bash
   npm run build
   npm start
   ```

### Phase 3: Documentation

1. **Create .env.example**
   - List all required variables
   - Add comments explaining each

2. **Create/Update README.md**
   - Project overview
   - Setup instructions
   - Deployment guide for Coolify
   - Environment variables reference

### Phase 4: Git Preparation

1. **Verify .gitignore**
   - Ensure no secrets are committed
   - Check dist/ is ignored (already is)

2. **Create deployment branch** (optional)
   - Or push directly to main

3. **Push to public repository**

## Environment Variables for Coolify

### Required
```
SESSION_SECRET=<generate-random-string>
DATABASE_URL=postgresql://user:password@host:port/database
```

### Required for Image Uploads (S3)
```
STORAGE_TYPE=s3
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

### Optional (Email Notifications)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Optional (MinIO - if using instead of AWS S3)
```
S3_ENDPOINT=https://your-minio-instance.com
```

## Nixpacks Configuration

Nixpacks will automatically detect:
- ✅ Node.js project (from package.json)
- ✅ TypeScript (from tsconfig.json)
- ✅ Build command: `npm run build`
- ✅ Start command: `npm start`

No additional configuration files needed.

## Testing Checklist

Before pushing to Git:
- [ ] Build completes successfully: `npm run build`
- [ ] Production server starts: `npm start`
- [ ] Static files are served correctly
- [ ] Image upload works with S3 configuration
- [ ] Database connection works
- [ ] No Replit-specific code breaks in production mode
- [ ] All environment variables documented

## Deployment Steps on Coolify

1. Push code to public Git repository
2. In Coolify, create new application
3. Connect to Git repository
4. Select Nixpacks buildpack
5. Set environment variables
6. Deploy

## Rollback Plan

If deployment fails:
1. Check Coolify build logs
2. Verify environment variables are set correctly
3. Check database connectivity
4. Verify S3 credentials if using S3 storage

