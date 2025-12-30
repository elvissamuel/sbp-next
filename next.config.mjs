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
  // Ensure pdf-parse works in serverless environments
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent bundling issues with pdf-parse in serverless
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('pdf-parse')
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals
        config.externals = [
          originalExternals,
          ({ request }) => {
            if (request === 'pdf-parse') {
              return true
            }
            return false
          },
        ]
      }
    }
    return config
  },
}

export default nextConfig
