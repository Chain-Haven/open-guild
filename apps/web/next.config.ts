import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@open-guild/agent-sdk'],
  experimental: {
    // keep defaults; can enable serverActions etc later
  }
}

export default nextConfig
