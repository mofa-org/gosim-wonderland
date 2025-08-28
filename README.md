# GOSIM Wonderland

> AI-powered cartoon avatar generation system for interactive events

GOSIM Wonderland 是一个为大会/活动设计的互动体验系统，用户可以拍照或上传图片，通过AI生成GOSIM风格的卡通头像，并在大屏幕上实时展示。

## 功能特色

- - **双重图片输入方式**：支持拍照或上传图片
- - **AI卡通化处理**：使用OpenAI GPT-4 Vision + DALL-E 3
- - **三端系统架构**：用户端、展示端、管理端
- - **实时更新**：Server-Sent Events实时同步
- - **内容审核**：人工审核确保内容质量
- - **响应式设计**：适配各种设备和屏幕

## 系统架构

### 三个独立应用

1. **Photo-app** (用户端) - 拍照/上传图片
2. **Display-app** (展示端) - 大屏实时展示
3. **Admin-panel** (管理端) - 内容审核管理

### 技术栈

- **前端**: Next.js 15 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3)
- **文件存储**: 本地文件系统
- **AI处理**: OpenAI GPT-4 Vision + DALL-E 3
- **实时更新**: Server-Sent Events
- **测试**: Jest + Testing Library

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

在每个应用目录下创建 `.env.local` 文件：

```bash
# photo-app/.env.local
OPENAI_API_KEY=your_openai_api_key_here
ADMIN_PASSWORD=wonderland_admin_2024
```

### 启动应用

```bash
# 启动用户拍照端 (端口 3000)
cd photo-app && npm run dev

# 启动大屏展示端 (端口 3002)  
cd display-app && npm run dev -- --port 3002

# 启动管理审核后台 (端口 3003)
cd admin-panel && npm run dev -- --port 3003
```

## - 使用流程

1. **用户操作**: 访问 `http://localhost:3000` 拍照或上传图片
2. **AI处理**: 系统自动生成卡通头像
3. **内容审核**: 管理员在 `http://localhost:3003` 审核内容
4. **大屏展示**: 审核通过的图片在 `http://localhost:3002` 展示

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

- `POST /api/upload` - 上传图片
- `GET /api/photo/{id}` - 获取图片状态
- `GET /api/photos` - 获取图片列表
- `POST /api/admin/approve/{id}` - 审核通过
- `DELETE /api/admin/approve/{id}` - 审核拒绝

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

### OpenAI API 配置

项目使用 OpenAI GPT-4 Vision 分析图片特征，然后用 DALL-E 3 生成卡通化图像。需要有效的 OpenAI API 密钥。

### 文件存储

- 图片文件存储在 `public/uploads/` 目录
- 数据库文件存储在 `data/wonderland.db`

## - 监控指标

- 上传成功率
- AI处理成功率  
- 用户访问量
- 系统响应时间

## - 注意事项

- 确保有足够的OpenAI API配额
- 定期清理上传的图片文件
- 监控服务器存储空间
- 设置合理的图片大小限制

## - 贡献

欢迎提交 Issue 和 Pull Request！

## - 许可证

MIT License

---

- Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>