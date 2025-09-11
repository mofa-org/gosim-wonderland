/**
 * Cloudflare Worker for GOSIM Wonderland
 * 域名路由分流：
 * - 80端口（Photo App摄像头功能）重定向到 test.liyao.space（HTTPS支持）
 * - 其他端口继续使用 wonderland.mofa.ai
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理us.liyao.space域名或Worker测试域名
    if (url.hostname === 'us.liyao.space' || url.hostname.includes('workers.dev')) {
      
      // 测试域名处理重定向和代理
      if (url.hostname.includes('workers.dev')) {
        
        // 通过路径模拟端口：/8000, /8081, /8082, /8080
        const pathPort = url.pathname.match(/^\/(\d{4})(\/.*)?$/);
        
        if (pathPort) {
          const port = pathPort[1];
          const remainingPath = pathPort[2] || '';
          const redirectUrl = `http://wonderland.mofa.ai:${port}${remainingPath}${url.search}`;
          console.log(`TEST - Redirecting port ${port}: ${request.url} → ${redirectUrl}`);
          return Response.redirect(redirectUrl, 301);
        }
        
        // 根路径：重定向到test.liyao.space
        const redirectUrl = `https://test.liyao.space${url.pathname}${url.search}`;
        console.log(`TEST - Redirecting 80 port: ${request.url} → ${redirectUrl}`);
        return Response.redirect(redirectUrl, 301);
      }
      
      // 80端口：Photo App - 需要HTTPS支持摄像头功能
      if (url.port === '' || url.port === '80') {
        const redirectUrl = `https://test.liyao.space${url.pathname}${url.search}`;
        console.log(`Redirecting 80 port: ${request.url} → ${redirectUrl}`);
        return Response.redirect(redirectUrl, 301);
      }
      
      // 其他端口：代理到实际服务器IP
      // 这里需要替换为你的实际服务器IP地址
      const serverIP = 'YOUR_SERVER_IP'; // 替换为实际服务器IP
      const targetUrl = `http://${serverIP}:${url.port || '80'}${url.pathname}${url.search}`;
      
      console.log(`Proxying to server: ${request.url} → ${targetUrl}`);
      
      // 创建新的请求，代理到服务器
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      
      return fetch(modifiedRequest);
    }
    
    // 非wonderland.mofa.ai域名直接通过
    return fetch(request);
  }
};

/*
部署说明：

1. 登录Cloudflare控制台
2. Workers & Pages → Create application → Create Worker  
3. 复制此代码到Worker编辑器
4. 修改 serverIP 为你的实际服务器IP地址
5. 点击 Deploy
6. 设置自定义域名：
   - Workers & Pages → 你的Worker → Settings → Triggers  
   - Add Custom Domain: us.liyao.space
   - 等待DNS生效
7. 确保 test.liyao.space 也指向同一服务器

端口分流结果：
- http://wonderland.mofa.ai (80端口) → https://test.liyao.space (摄像头HTTPS支持)
- http://wonderland.mofa.ai:8000 → 代理到服务器IP:8000 (AI主服务)
- http://wonderland.mofa.ai:8080 → 代理到服务器IP:8080 (AI静态服务，阿里云访问)
- http://wonderland.mofa.ai:8081 → 代理到服务器IP:8081 (Display App)  
- http://wonderland.mofa.ai:8082 → 代理到服务器IP:8082 (Admin Panel)

注意事项：
- 确保test.liyao.space指向相同的服务器
- 确保test.liyao.space在Cloudflare中启用SSL
- Worker会自动处理所有HTTP请求
*/