import { NextRequest, NextResponse } from 'next/server'
import { PhotoService } from '@/lib/db-operations'

const photoService = new PhotoService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const photos = photoService.getPhotosByStatus(status as any, limit)
    const stats = photoService.getStats()
    
    return NextResponse.json({
      success: true,
      photos,
      stats
    })
    
  } catch (error) {
    console.error('获取照片失败:', error)
    return NextResponse.json(
      { success: false, error: '获取照片失败' },
      { status: 500 }
    )
  }
}