import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production build, the server runs from dist/index.cjs
  // and static files are in dist/public
  const distPath = path.resolve(__dirname, "public");
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. ` +
      `Make sure to run 'npm run build' before starting the production server. ` +
      `Expected location: ${distPath}`
    );
  }

  app.use(express.static(distPath, {
    maxAge: process.env.NODE_ENV === "production" ? "1y" : "0",
    etag: true,
  }));

  // fall through to index.html if the file doesn't exist (for SPA routing)
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.status(404).json({ error: "index.html not found. Build may be incomplete." });
    }
    res.sendFile(indexPath);
  });
}
