window.__rum = {
  pid: 'fx08lzooek@df6c2cc04f6d757',
  endpoint: 'https://fx08lzooek-default-cn.rum.aliyuncs.com',
  // 设置环境信息，参考值：'prod' | 'gray' | 'pre' | 'daily' | 'local'
  env: 'prod',
  // 设置路由模式， 参考值：'history' | 'hash'
  spaMode: 'history',
  collectors: {
    // 页面性能指标监听开关，默认开启
    perf: false,
    // WebVitals指标监听开关，默认开启
    webVitals: false,
    // Ajax监听开关，默认开启
    api: false,
    // 静态资源开关，默认开启
    staticResource: true,
    // JS错误监听开关，默认开启
    jsError: false,
    // 控制台错误监听开关，默认开启
    consoleError: false,
    // 用户行为监听开关，默认开启
    action: true
  },
  // 链路追踪配置开关，默认关闭
  tracing: true
}
