/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 禁用 Service Worker 以避免缓存问题
  experimental: {
    workerThreads: false,
  },
  // 确保静态资源正确处理
  assetPrefix: '',
}

export default nextConfig
