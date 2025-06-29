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
    // 减少 Fast Refresh 的频率
    optimizePackageImports: ['lucide-react'],
  },
  // 允许在服务器组件中使用外部包
  serverExternalPackages: ['ws'],
  // 确保静态资源正确处理
  assetPrefix: '',
  // 减少开发模式下的日志输出
  logging: {
    fetches: {
      fullUrl: false,
    },
    level: 'error', // 只显示错误级别的日志
  },
  // 减少 Fast Refresh 日志
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 增加到60秒
    pagesBufferLength: 5,
  },
  // 开发模式优化
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // 减少热重载的敏感度
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      }
      
      // 禁用 Fast Refresh 和 Workbox 日志
      config.infrastructureLogging = {
        level: 'error',
      }
      
      // 禁用详细的构建日志
      config.stats = 'errors-only'
    }
    return config
  },
  
  // 环境变量配置以减少日志
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
}

export default nextConfig
