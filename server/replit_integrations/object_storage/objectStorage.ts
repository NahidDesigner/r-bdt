import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID, createHmac, createHash } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const STORAGE_TYPE = process.env.STORAGE_TYPE || (process.env.REPLIT_SIDECAR_ENDPOINT ? "replit" : "s3");

// The object storage client is used to interact with the object storage service.
let objectStorageClient: Storage | null = null;

if (STORAGE_TYPE === "replit") {
  try {
    objectStorageClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });
  } catch (error) {
    console.warn("Failed to initialize Replit storage, falling back to S3:", error);
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// S3 storage implementation using native fetch
class S3Storage {
  private endpoint: string;
  private bucket: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private publicUrl: string;

  constructor() {
    this.endpoint = process.env.S3_ENDPOINT || `https://s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com`;
    this.bucket = process.env.S3_BUCKET || "";
    this.region = process.env.S3_REGION || "us-east-1";
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
    this.publicUrl = process.env.S3_PUBLIC_URL || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      console.warn("S3 storage not fully configured. Image uploads may not work.");
    }
  }

  private async signRequest(method: string, path: string, headers: Record<string, string> = {}): Promise<string> {
    const url = new URL(path, this.endpoint);
    const host = url.hostname;
    const date = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const dateStamp = date.substr(0, 8);

    headers["host"] = host;
    headers["x-amz-date"] = date;

    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((key) => `${key.toLowerCase()}:${headers[key]}\n`)
      .join("");

    const signedHeaders = Object.keys(headers)
      .sort()
      .map((key) => key.toLowerCase())
      .join(";");

    const canonicalRequest = `${method}\n${url.pathname}\n${url.search}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = `${algorithm}\n${date}\n${credentialScope}\n${this.sha256(canonicalRequest)}`;

    const kSecret = `AWS4${this.secretAccessKey}`;
    const kDate = this.hmacSha256(kSecret, dateStamp);
    const kRegion = this.hmacSha256(kDate, this.region);
    const kService = this.hmacSha256(kRegion, "s3");
    const kSigning = this.hmacSha256(kService, "aws4_request");
    const signature = this.hmacSha256(kSigning, stringToSign);

    const authorization = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return authorization;
  }

  private sha256(data: string): string {
    return createHash("sha256").update(data).digest("hex");
  }

  private hmacSha256(key: string | Buffer, data: string): Buffer {
    return createHmac("sha256", key).update(data).digest();
  }

  private hmacSha256Hex(key: string | Buffer, data: string): string {
    return createHmac("sha256", key).update(data).digest("hex");
  }

  async getPresignedUploadURL(objectKey: string, contentType: string, expiresIn: number = 900): Promise<string> {
    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new Error("S3 storage not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
    }

    const now = new Date();
    const dateStamp = now.toISOString().substr(0, 10).replace(/-/g, "");
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    
    const url = new URL(`/${this.bucket}/${objectKey}`, this.endpoint);
    
    // Query parameters for presigned URL
    const params = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${this.accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": expiresIn.toString(),
      "X-Amz-SignedHeaders": "host",
    });

    // Canonical request for presigned URL
    const canonicalUri = `/${this.bucket}/${objectKey}`;
    const canonicalQueryString = params.toString();
    const canonicalHeaders = `host:${url.hostname}\n`;
    const signedHeaders = "host";
    const payloadHash = "UNSIGNED-PAYLOAD";
    
    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${this.sha256(canonicalRequest)}`;

    // Calculate signature
    const kDate = this.hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = this.hmacSha256(kDate, this.region);
    const kService = this.hmacSha256(kRegion, "s3");
    const kSigning = this.hmacSha256(kService, "aws4_request");
    const signature = this.hmacSha256Hex(kSigning, stringToSign);

    params.set("X-Amz-Signature", signature);
    url.search = params.toString();

    return url.toString();
  }

  getPublicURL(objectKey: string): string {
    return `${this.publicUrl}/${objectKey}`;
  }

  async fileExists(objectKey: string): Promise<boolean> {
    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      return false;
    }

    try {
      const path = `/${this.bucket}/${objectKey}`;
      const authorization = await this.signRequest("HEAD", path);
      const url = new URL(path, this.endpoint);

      const response = await fetch(url.toString(), {
        method: "HEAD",
        headers: {
          Authorization: authorization,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

const s3Storage = new S3Storage();

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  private storageType: string;

  constructor() {
    this.storageType = STORAGE_TYPE;
  }

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    if (this.storageType === "s3") {
      return [process.env.S3_BUCKET || ""].filter(Boolean);
    }
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    if (this.storageType === "s3") {
      return process.env.S3_BUCKET || "";
    }
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    if (this.storageType === "s3") {
      const exists = await s3Storage.fileExists(filePath);
      return exists ? ({ name: filePath } as File) : null;
    }

    if (!objectStorageClient) {
      return null;
    }

    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File | { name: string }, res: Response, cacheTtlSec: number = 3600) {
    try {
      if (this.storageType === "s3") {
        const objectKey = (file as { name: string }).name;
        const publicUrl = s3Storage.getPublicURL(objectKey);
        res.redirect(publicUrl);
        return;
      }

      if (!objectStorageClient || !("getMetadata" in file)) {
        throw new Error("Replit storage not available");
      }

      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    if (this.storageType === "s3") {
      const objectId = randomUUID();
      const objectKey = `uploads/${objectId}`;
      const uploadURL = await s3Storage.getPresignedUploadURL(objectKey, "application/octet-stream");
      return uploadURL;
    }

    if (!objectStorageClient) {
      throw new Error("Storage not configured. Set STORAGE_TYPE=replit with Replit environment or STORAGE_TYPE=s3 with S3 credentials.");
    }

    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File | { name: string }> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");

    if (this.storageType === "s3") {
      const exists = await s3Storage.fileExists(`uploads/${entityId}`);
      if (!exists) {
        throw new ObjectNotFoundError();
      }
      return { name: `uploads/${entityId}` };
    }

    if (!objectStorageClient) {
      throw new Error("Replit storage not available");
    }

    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    if (this.storageType === "s3") {
      // Extract object key from S3 URL
      try {
        const url = new URL(rawPath);
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2 && pathParts[0] === s3Storage["bucket"]) {
          const objectKey = pathParts.slice(1).join("/");
          return `/objects/${objectKey.replace("uploads/", "")}`;
        }
      } catch {
        // Not a URL, might already be a path
      }
      // If it's already a path starting with /objects/, return as is
      if (rawPath.startsWith("/objects/")) {
        return rawPath;
      }
      // Otherwise, assume it's an object key
      return `/objects/${rawPath.replace("uploads/", "")}`;
    }

    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
  
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    if (this.storageType === "s3") {
      // S3 ACL is handled via bucket policies, not per-object
      return normalizedPath;
    }

    if (!objectStorageClient) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath) as File;
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File | { name: string };
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    if (this.storageType === "s3") {
      // For S3, assume public read access (can be restricted via bucket policies)
      return requestedPermission === ObjectPermission.READ;
    }

    if (!objectStorageClient || !("getMetadata" in objectFile)) {
      return false;
    }

    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
