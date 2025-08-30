import { getDatabase } from './database'
import { Photo, PhotoStatus } from './types'
import { v4 as uuidv4 } from 'uuid'

export class PhotoService {
  private db = getDatabase()

  createPhoto(originalUrl: string, userSession?: string, caption?: string): Photo {
    const id = uuidv4()
    const photo: Omit<Photo, 'created_at'> = {
      id,
      original_url: originalUrl,
      status: 'pending',
      user_session: userSession,
      caption: caption
    }

    const stmt = this.db.prepare(`
      INSERT INTO photos (id, original_url, status, user_session, caption)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(id, originalUrl, 'pending', userSession, caption)
    
    return this.getPhoto(id)!
  }

  getPhoto(id: string): Photo | null {
    const stmt = this.db.prepare('SELECT * FROM photos WHERE id = ?')
    const row = stmt.get(id) as any
    
    if (!row) return null
    
    return {
      id: row.id,
      original_url: row.original_url,
      cartoon_url: row.cartoon_url,
      status: row.status as PhotoStatus,
      created_at: row.created_at,
      approved_at: row.approved_at,
      user_session: row.user_session,
      processing_error: row.processing_error,
      caption: row.caption,
      ai_description: row.ai_description
    }
  }

  updatePhoto(id: string, updates: Partial<Photo>): boolean {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
    const values = Object.values(updates)
    
    const stmt = this.db.prepare(`UPDATE photos SET ${fields} WHERE id = ?`)
    const result = stmt.run(...values, id)
    
    return result.changes > 0
  }

  getPhotosByStatus(status: PhotoStatus, limit?: number): Photo[] {
    let query = 'SELECT * FROM photos WHERE status = ? ORDER BY created_at DESC'
    if (limit) query += ` LIMIT ${limit}`
    
    const stmt = this.db.prepare(query)
    const rows = stmt.all(status) as any[]
    
    return rows.map(row => ({
      id: row.id,
      original_url: row.original_url,
      cartoon_url: row.cartoon_url,
      status: row.status as PhotoStatus,
      created_at: row.created_at,
      approved_at: row.approved_at,
      user_session: row.user_session,
      processing_error: row.processing_error,
      caption: row.caption,
      ai_description: row.ai_description
    }))
  }

  approvePhoto(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE photos 
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)
    const result = stmt.run(id)
    return result.changes > 0
  }

  rejectPhoto(id: string): boolean {
    const stmt = this.db.prepare('UPDATE photos SET status = "rejected" WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  getStats() {
    const stmt = this.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count 
      FROM photos 
      GROUP BY status
    `)
    
    const rows = stmt.all() as { status: string, count: number }[]
    const stats = { pending: 0, approved: 0, rejected: 0 }
    
    rows.forEach(row => {
      stats[row.status as keyof typeof stats] = row.count
    })
    
    return stats
  }
}