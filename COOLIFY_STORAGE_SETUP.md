# Setting Up Coolify Storage (MinIO) for StoreBuilder BD

## Quick Guide

Coolify provides **MinIO** (S3-compatible storage) as a built-in service. This guide shows you how to set it up.

## Step 1: Create MinIO Service in Coolify

1. **Go to Coolify Dashboard**
   - Navigate to "Resources" or "Services"
   - Look for "MinIO" or "Object Storage"

2. **Create MinIO Service**
   - Click "Add Service" or "Create MinIO"
   - Coolify will automatically:
     - Deploy MinIO container
     - Generate access credentials
     - Provide connection details

3. **Get Your Credentials**
   After creation, Coolify will show you:
   - **Endpoint URL**: Usually `http://minio.coolify.internal:9000` (for internal) or a public URL
   - **Access Key**: Something like `minioadmin` or auto-generated
   - **Secret Key**: Auto-generated secret
   - **Web UI URL**: To manage buckets

## Step 2: Create a Bucket

1. **Access MinIO Web Interface**
   - Use the Web UI URL provided by Coolify
   - Or access via: `http://your-coolify-domain/minio` (if exposed)

2. **Login**
   - Use the Access Key and Secret Key from Step 1

3. **Create Bucket**
   - Click "Create Bucket"
   - Name it: `storebuilder-uploads` (or any name you prefer)
   - Make note of this bucket name

4. **Set Bucket Policy (Optional - for public access)**
   - Go to bucket settings
   - Set policy to allow public read access if you want images to be directly accessible

## Step 3: Configure Your App

In your Coolify application's environment variables, add:

```
STORAGE_TYPE=s3
S3_ENDPOINT=http://minio.coolify.internal:9000
S3_BUCKET=storebuilder-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<your-minio-access-key>
S3_SECRET_ACCESS_KEY=<your-minio-secret-key>
S3_PUBLIC_URL=http://minio.coolify.internal:9000/storebuilder-uploads
```

### Finding the Values:

- **S3_ENDPOINT**: 
  - Internal: `http://minio.coolify.internal:9000`
  - Public: Check Coolify's MinIO service details for public URL
  
- **S3_BUCKET**: The bucket name you created (e.g., `storebuilder-uploads`)

- **S3_REGION**: Can be `us-east-1` (MinIO doesn't care about regions, but the code needs it)

- **S3_ACCESS_KEY_ID**: From Coolify's MinIO service credentials

- **S3_SECRET_ACCESS_KEY**: From Coolify's MinIO service credentials

- **S3_PUBLIC_URL**: 
  - If MinIO is public: `http://your-minio-domain:9000/storebuilder-uploads`
  - If internal only: `http://minio.coolify.internal:9000/storebuilder-uploads`
  - **Note**: If MinIO is internal-only, files will be served through your app, not directly from MinIO

## Step 4: Complete Environment Variables

Don't forget the other required variables:

```
SESSION_SECRET=<generate-random-string>
DATABASE_URL=postgresql://user:pass@host:port/db
STORAGE_TYPE=s3
S3_ENDPOINT=http://minio.coolify.internal:9000
S3_BUCKET=storebuilder-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<from-coolify>
S3_SECRET_ACCESS_KEY=<from-coolify>
S3_PUBLIC_URL=http://minio.coolify.internal:9000/storebuilder-uploads
```

## Troubleshooting

### Images not uploading?
- Check that MinIO service is running in Coolify
- Verify S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are correct
- Check bucket name matches S3_BUCKET variable

### Images not displaying?
- If MinIO is internal-only, the app will serve files through `/objects/` route
- If MinIO is public, check S3_PUBLIC_URL is correct
- Verify bucket policy allows read access

### Connection errors?
- Ensure S3_ENDPOINT is correct (check Coolify's MinIO service details)
- Verify MinIO service is accessible from your app container
- Check network connectivity between services in Coolify

## Alternative: Using External MinIO

If you want to use an external MinIO instance:

```
STORAGE_TYPE=s3
S3_ENDPOINT=https://your-minio-domain.com
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_URL=https://your-minio-domain.com/your-bucket-name
```

