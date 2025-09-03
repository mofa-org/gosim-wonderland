/**
 * @jest-environment node
 */

import { POST } from '../route'
import { NextRequest } from 'next/server'
import { PhotoService } from '@/lib/db-operations'

// Mock dependencies
jest.mock('@/lib/db-operations')
jest.mock('fs/promises')
jest.mock('openai')

const MockedPhotoService = PhotoService as jest.MockedClass<typeof PhotoService>

describe('/api/upload', () => {
  let mockPhotoService: jest.Mocked<PhotoService>

  beforeEach(() => {
    mockPhotoService = new MockedPhotoService() as jest.Mocked<PhotoService>
    MockedPhotoService.mockImplementation(() => mockPhotoService)
    
    // Mock fs/promises
    const fs = require('fs/promises')
    fs.writeFile = jest.fn().mockResolvedValue(undefined)
    fs.mkdir = jest.fn().mockResolvedValue(undefined)
    
    jest.clearAllMocks()
  })

  it('should handle missing file', async () => {
    const formData = new FormData()
    formData.append('userSession', 'test-session')

    const request = {
      formData: jest.fn().mockResolvedValue(formData)
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未找到图片文件')
  })

  it('should create photo record on successful upload', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const mockPhoto = {
      id: 'test-id',
      original_url: '/uploads/test.jpg',
      status: 'pending' as const,
      created_at: new Date().toISOString()
    }

    // Mock file reading methods
    const mockArrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8))
    Object.defineProperty(mockFile, 'arrayBuffer', {
      value: mockArrayBuffer
    })

    const formData = new FormData()
    formData.append('photo', mockFile)
    formData.append('userSession', 'test-session')

    mockPhotoService.createPhoto.mockReturnValue(mockPhoto)

    const request = {
      formData: jest.fn().mockResolvedValue(formData)
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.photo).toEqual(mockPhoto)
    expect(mockPhotoService.createPhoto).toHaveBeenCalledWith(
      expect.stringContaining('/uploads/'),
      'test-session'
    )
  })

  it('should handle upload errors', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    const formData = new FormData()
    formData.append('photo', mockFile)

    mockPhotoService.createPhoto.mockImplementation(() => {
      throw new Error('Database error')
    })

    const request = {
      formData: jest.fn().mockResolvedValue(formData)
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('上传失败')
  })
})