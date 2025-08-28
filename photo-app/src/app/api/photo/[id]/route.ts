import { NextRequest, NextResponse } from 'next/server'
import { PhotoService } from '@/lib/db-operations'

const photoService = new PhotoService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const photo = photoService.getPhoto(id)
    
    if (!photo) {
      return NextResponse.json(
        { success: false, error: '照片不存在' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      photo
    })
    
  } catch (error) {
    console.error('获取照片失败:', error)
    return NextResponse.json(
      { success: false, error: '获取照片失败' },
      { status: 500 }
    )
  }
}