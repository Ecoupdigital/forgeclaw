import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js module that cannot be bundled by webpack.
  // Mark it as external so API routes can require() it at runtime.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
