/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // External packages for server-side execution
  serverExternalPackages: ['pdf-parse'],
}

export default nextConfig
