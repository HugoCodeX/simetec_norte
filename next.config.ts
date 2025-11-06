import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  serverActions: {
    // Aumenta el límite del cuerpo para Server Actions (por defecto es 1MB)
    // Valores válidos: número en bytes o string tipo '3mb', '500kb', etc.
    bodySizeLimit: '5000mb',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
