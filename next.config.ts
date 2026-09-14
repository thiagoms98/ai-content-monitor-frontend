import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = (
      process.env.API_URL ||
      "https://ai-content-api-a0hxhngeb6ewbeha.eastus-01.azurewebsites.net"
    ).trim().replace(/\/+$/, "");

    return [
      { source: "/api/backend/analyze", destination: `${apiUrl}/analyze` },
      { source: "/api/backend/health", destination: `${apiUrl}/health` },
    ];
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
