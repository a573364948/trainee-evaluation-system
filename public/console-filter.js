// 控制台日志过滤器 - 隐藏 Fast Refresh 日志
(function() {
  'use strict';
  
  // 保存原始的 console 方法
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  // 需要过滤的关键词
  const filterKeywords = [
    'Fast Refresh',
    'rebuilding',
    'done in',
    'hot-reloader-client'
  ];
  
  // 检查是否应该过滤某条日志
  function shouldFilter(message) {
    const messageStr = String(message);
    return filterKeywords.some(keyword => messageStr.includes(keyword));
  }
  
  // 重写 console.log
  console.log = function(...args) {
    if (!shouldFilter(args[0])) {
      originalLog.apply(console, args);
    }
  };
  
  // 重写 console.warn
  console.warn = function(...args) {
    if (!shouldFilter(args[0])) {
      originalWarn.apply(console, args);
    }
  };
  
  // 重写 console.error
  console.error = function(...args) {
    if (!shouldFilter(args[0])) {
      originalError.apply(console, args);
    }
  };
  
  console.log('🔧 控制台过滤器已启用 - Fast Refresh 日志已隐藏');
})();
