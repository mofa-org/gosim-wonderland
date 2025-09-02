// PM2 配置文件
module.exports = {
  apps: [
    {
      name: 'gosim-ai-server',
      script: 'python3',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8000',
      cwd: './ai-api-server',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'gosim-photo-app',
      script: 'npm',
      args: 'start',
      cwd: './photo-app',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    },
    {
      name: 'gosim-display-app',
      script: 'npm',
      args: 'start',
      cwd: './display-app',
      env: {
        NODE_ENV: 'production',
        PORT: 8081
      }
    },
    {
      name: 'gosim-admin-panel',
      script: 'npm',
      args: 'start',
      cwd: './admin-panel',
      env: {
        NODE_ENV: 'production',
        PORT: 8082
      }
    }
  ]
}