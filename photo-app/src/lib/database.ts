import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'wonderland.db')
let db: Database.Database | null = null

export const getDatabase = () => {
  if (!db) {
    // 确保data目录存在
    const dataDir = path.dirname(dbPath)
    try {
      const fs = require('fs')
      fs.mkdirSync(dataDir, { recursive: true })
    } catch {
      // 目录可能已存在
    }
    
    db = new Database(dbPath)
    
    // 创建photos表
    db.exec(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        original_url TEXT NOT NULL,
        cartoon_url TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        user_session TEXT,
        processing_error TEXT,
        caption TEXT,
        ai_description TEXT
      )
    `)
    
    // 添加新字段（如果表已存在）
    try {
      db.exec('ALTER TABLE photos ADD COLUMN caption TEXT')
    } catch {
      // 字段已存在，忽略错误
    }
    
    try {
      db.exec('ALTER TABLE photos ADD COLUMN ai_description TEXT')
    } catch {
      // 字段已存在，忽略错误
    }
    
    // 创建索引
    db.exec('CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at)')
  }
  
  return db
}

export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')