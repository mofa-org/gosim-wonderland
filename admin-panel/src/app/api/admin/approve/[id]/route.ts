import { NextRequest, NextResponse } from 'next/server'
import { PhotoService } from '@/lib/db-operations'

const photoService = new PhotoService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = photoService.approvePhoto(id)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '审核通过'
      })
    } else {
      return NextResponse.json(
        { success: false, error: '照片不存在或已处理' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('审核失败:', error)
    return NextResponse.json(
      { success: false, error: '审核失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = photoService.rejectPhoto(id)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '已拒绝'
      })
    } else {
      return NextResponse.json(
        { success: false, error: '照片不存在或已处理' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('拒绝失败:', error)
    return NextResponse.json(
      { success: false, error: '拒绝失败' },
      { status: 500 }
    )
  }
}