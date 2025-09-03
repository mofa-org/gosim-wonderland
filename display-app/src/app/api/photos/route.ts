import { NextRequest, NextResponse } from 'next/server'
import { PhotoService } from '@/lib/db-operations'
import { PhotoStatus } from '@/lib/types'

const photoService = new PhotoService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'approved'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const photos = photoService.getPhotosByStatus(status as PhotoStatus, limit)
    
    return NextResponse.json({
      success: true,
      photos
    })
    
  } catch (error) {
    console.error('获取照片失败:', error)
    return NextResponse.json(
      { success: false, error: '获取照片失败' },
      { status: 500 }
    )
  }
}