import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js module that cannot be bundled by webpack.
  // Mark it as external so API routes can require() it at runtime.
  serverExternalPackages: ["better-sqlite3"],

  // Next.js 16 blocks cross-origin HMR requests by default. When the bot/dashboard
  // are accessed via 127.0.0.1 (the loopback IP) instead of `localhost`, the HMR
  // websocket handshake is rejected with 426, which makes the React client crash
  // during hydration — visible as a stuck "Loading sessions..." with no console
  // errors other than the HMR failure itself. Allowing the loopback explicitly
  // fixes the dev experience without weakening production security.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
