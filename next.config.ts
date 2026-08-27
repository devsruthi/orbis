import type { NextConfig } from "next";

const isTauriBuild = process.env.TAURI_BUILD === "1";
const tauriDevHost = process.env.TAURI_DEV_HOST;

const nextConfig: NextConfig = {};

if (isTauriBuild) {
  nextConfig.output = "export";
  nextConfig.trailingSlash = true;
  nextConfig.images = { unoptimized: true };
  // API route tests import stashed server routes. Full-project typecheck
  // remains `npm run typecheck` against the web tree.
  nextConfig.typescript = { ignoreBuildErrors: true };
}

if (tauriDevHost) {
  nextConfig.assetPrefix = `http://${tauriDevHost}:3000`;
}

export default nextConfig;
