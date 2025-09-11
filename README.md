# GOSIM Wonderland

> AI-powered cartoon avatar generation system for interactive events

GOSIM Wonderland 是一个为大会/活动设计的互动体验系统，用户可以拍照或上传图片，通过AI生成GOSIM风格的卡通头像，并在大屏幕上实时展示。

## 功能特色

- - **双重图片输入方式**：支持拍照或上传图片
- - **AI卡通化处理**：使用阿里云通义万相
- - **三端系统架构**：用户端、展示端、管理端
- - **实时更新**：Server-Sent Events实时同步
- - **内容审核**：人工审核确保内容质量
- - **响应式设计**：适配各种设备和屏幕

## 系统架构

### 四个独立应用

1. **Photo-app** (用户端) - 拍照/上传图片，调用AI服务 (端口80)
2. **Display-app** (展示端) - 大屏实时展示审核通过的图片 (端口8081)
3. **Admin-panel** (管理端) - 内容审核管理 (端口8082)  
4. **AI-api-server** (AI服务) - 调用阿里云通义万相生成卡通图片
   - 主服务 (端口8000): 接收photo-app的AI请求
   - 静态服务 (端口8080): 供阿里云下载原始图片

### 技术栈

**前端应用** (Next.js):
- **框架**: Next.js 15 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes  
- **数据库**: SQLite (better-sqlite3)
- **文件存储**: 本地文件系统
- **实时更新**: Server-Sent Events
- **测试**: Jest + Testing Library

**AI服务器** (Python):
- **框架**: FastAPI + Python
- **AI引擎**: 阿里云通义万相 (DashScope)
- **图片处理**: 下载缓存 + 静态文件服务
- **部署**: PM2进程管理

### 架构特点

**数据流向**:
1. 用户 → Photo-app (80端口)
2. Photo-app → AI-server (8000端口) 
3. AI-server下载图片 → 本地缓存
4. AI-server → 阿里云 (发送8080端口URL)
5. 阿里云 → AI-server (8080端口下载图片)
6. 阿里云处理 → AI-server → Photo-app → 数据库

**端口分配**:
- 80: Photo App (用户交互)
- 8000: AI主服务 (业务逻辑)  
- 8080: AI静态服务 (供阿里云访问)
- 8081: Display App (大屏展示)
- 8082: Admin Panel (管理后台)

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 为所有三个应用安装依赖
cd photo-app && npm install
cd ../display-app && npm install  
cd ../admin-panel && npm install
```

### 配置环境变量

**只需要配置AI服务器**，其他应用无需环境变量：

```bash
# ai-api-server/.env
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```

**注意**：
- photo-app、display-app、admin-panel 都不需要环境变量配置
- 如果没有API key，AI服务器会运行在Mock模式下，生成随机颜色的图片  
- Mock模式适合开发调试，不需要消耗API配额
- 生产环境需要配置有效的DashScope API密钥

### 启动应用

开发环境：
```bash
# 启动AI服务器
./start-ai-server.sh

# 启动用户拍照端 (端口 80)
./start-photo-app.sh  

# 启动大屏展示端 (端口 8081)
./start-display-app.sh

# 启动管理审核后台 (端口 8082)
./start-admin-panel.sh
```

生产环境：
```bash
./build-and-start-production.sh
```

## - 使用流程

1. **用户操作**: 访问 `http://localhost:80` 拍照或上传图片
2. **AI处理流程**:
   - photo-app 调用 AI服务器 (8000端口)
   - AI服务器下载原始图片并缓存到本地
   - AI服务器通过静态服务 (8080端口) 提供给阿里云访问
   - 阿里云从 8080 端口下载图片，处理后返回卡通版本
3. **内容审核**: 管理员在 `http://localhost:8082` 审核内容
4. **大屏展示**: 审核通过的图片在 `http://localhost:8081` 展示

## - 测试

```bash
# 在各个应用目录下运行测试
cd photo-app && npm test
cd display-app && npm test
cd admin-panel && npm test
```

## - 开发说明

### 数据库结构

```sql
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  original_url TEXT NOT NULL,
  cartoon_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME,
  user_session TEXT,
  processing_error TEXT
);
```

### API 接口

**Photo-app 接口**:
- `POST /api/upload` - 上传图片，调用AI处理
- `GET /api/photo/{id}` - 获取图片状态
- `GET /api/photos` - 获取图片列表
- `GET /api/static/[...path]` - 静态文件访问

**Admin-panel 接口**:
- `POST /api/admin/approve/{id}` - 审核通过
- `DELETE /api/admin/approve/{id}` - 审核拒绝
- `GET /api/admin/photos` - 获取待审核图片

**Display-app 接口**:
- `GET /api/events` - Server-Sent Events 实时更新
- `GET /api/photos` - 获取已审核图片

**AI-api-server 接口**:
- `POST /generate-image/` - 生成卡通图片 (8000端口)
- `GET /original-images/{filename}` - 原始图片访问 (8080端口)

## - 部署

### 构建生产版本

```bash
cd photo-app && npm run build
cd ../display-app && npm run build
cd ../admin-panel && npm run build
```

### 启动生产服务

```bash
cd photo-app && npm start
cd ../display-app && npm start
cd ../admin-panel && npm start
```

## - 配置说明

### 阿里云API 配置

项目使用阿里云通义万相进行图片卡通化处理。需要有效的 DashScope API 密钥。

- AI主服务: http://localhost:8000 (业务接口)
- AI静态服务: http://localhost:8080 (供阿里云访问图片)

### 文件存储

**图片文件**:
- 用户上传: `photo-app/public/uploads/`
- AI生成的卡通图: `ai-photos/`
- 原始图片缓存: `original-photos-cache/` (AI服务器用)
- 实际原始图片: `original-photos/`

**数据库**:
- 主数据库: `photo-app/data/wonderland.db`
- 所有应用都共享这个数据库

## - 监控指标

- 上传成功率
- AI处理成功率  
- 用户访问量
- 系统响应时间

## - 注意事项

**服务器配置**:
- 确保有足够的阿里云DashScope API配额
- 开放8080端口供阿里云访问图片
- 设置防火墙允许端口80, 8000, 8080, 8081, 8082

**维护**:
- 定期清理上传和缓存的图片文件
- 监控服务器存储空间
- 设置合理的图片大小限制
- 定期备份SQLite数据库

**开发**:
- Mock模式下可以无API key进行开发测试
- 所有应用共享同一个SQLite数据库

## - 贡献

欢迎提交 Issue 和 Pull Request！

## - 许可证

MIT License

---

- Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>