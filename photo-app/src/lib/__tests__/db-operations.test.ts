import { PhotoService } from '../db-operations'
import { getDatabase } from '../database'

// Mock database
jest.mock('../database', () => ({
  getDatabase: jest.fn()
}))

const mockDb = {
  prepare: jest.fn(),
  exec: jest.fn()
}

const mockStmt = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn()
}

beforeEach(() => {
  ;(getDatabase as jest.Mock).mockReturnValue(mockDb)
  mockDb.prepare.mockReturnValue(mockStmt)
  jest.clearAllMocks()
})

describe('PhotoService', () => {
  let photoService: PhotoService

  beforeEach(() => {
    photoService = new PhotoService()
  })

  describe('createPhoto', () => {
    it('should create a new photo record', () => {
      const mockPhoto = {
        id: 'test-id',
        original_url: '/test.jpg',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      }

      mockStmt.run.mockReturnValue({ changes: 1 })
      mockStmt.get.mockReturnValue(mockPhoto)

      const result = photoService.createPhoto('/test.jpg', 'session-123')

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO photos')
      )
      expect(mockStmt.run).toHaveBeenCalled()
      expect(result).toEqual(mockPhoto)
    })
  })

  describe('getPhoto', () => {
    it('should return photo by id', () => {
      const mockPhoto = {
        id: 'test-id',
        original_url: '/test.jpg',
        cartoon_url: null,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        approved_at: null,
        user_session: 'session-123',
        processing_error: null
      }

      mockStmt.get.mockReturnValue(mockPhoto)

      const result = photoService.getPhoto('test-id')

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM photos WHERE id = ?')
      expect(mockStmt.get).toHaveBeenCalledWith('test-id')
      expect(result).toEqual(mockPhoto)
    })

    it('should return null if photo not found', () => {
      mockStmt.get.mockReturnValue(undefined)

      const result = photoService.getPhoto('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('updatePhoto', () => {
    it('should update photo successfully', () => {
      mockStmt.run.mockReturnValue({ changes: 1 })

      const result = photoService.updatePhoto('test-id', { 
        cartoon_url: '/cartoon.jpg' 
      })

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE photos SET cartoon_url = ? WHERE id = ?'
      )
      expect(mockStmt.run).toHaveBeenCalledWith('/cartoon.jpg', 'test-id')
      expect(result).toBe(true)
    })

    it('should return false if no rows affected', () => {
      mockStmt.run.mockReturnValue({ changes: 0 })

      const result = photoService.updatePhoto('test-id', { 
        cartoon_url: '/cartoon.jpg' 
      })

      expect(result).toBe(false)
    })
  })

  describe('approvePhoto', () => {
    it('should approve photo successfully', () => {
      mockStmt.run.mockReturnValue({ changes: 1 })

      const result = photoService.approvePhoto('test-id')

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE photos')
      )
      expect(mockStmt.run).toHaveBeenCalledWith('test-id')
      expect(result).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return correct stats', () => {
      const mockStats = [
        { status: 'pending', count: 5 },
        { status: 'approved', count: 10 },
        { status: 'rejected', count: 2 }
      ]

      mockStmt.all.mockReturnValue(mockStats)

      const result = photoService.getStats()

      expect(result).toEqual({
        pending: 5,
        approved: 10,
        rejected: 2
      })
    })

    it('should handle missing status counts', () => {
      const mockStats = [
        { status: 'pending', count: 3 }
      ]

      mockStmt.all.mockReturnValue(mockStats)

      const result = photoService.getStats()

      expect(result).toEqual({
        pending: 3,
        approved: 0,
        rejected: 0
      })
    })
  })
})