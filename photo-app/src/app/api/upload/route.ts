import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { PhotoService } from '@/lib/db-operations'

const photoService = new PhotoService()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File
    const userSession = formData.get('userSession') as string
    const caption = formData.get('caption') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到图片文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '请上传图片文件' },
        { status: 400 }
      )
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '图片文件过大，请选择小于10MB的图片' },
        { status: 400 }
      )
    }

    // 保存原图
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
    const uploadDir = path.join(process.cwd(), '..', 'original-photos')
    
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)
    
    const originalUrl = `/original-photos/${fileName}`
    
    // 存储到数据库
    const photo = photoService.createPhoto(originalUrl, userSession, caption)
    
    // 调用AI服务处理图片
    try {
      const aiResponse = await fetch('http://127.0.0.1:8000/generate-image/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: 'qwen-image-edit',
          prompt: caption || '生成可爱的卡通形象',
          base_image_url: `http://localhost:8080${originalUrl}`
        })
      })
      
      const aiResult = await aiResponse.json()
      
      if (aiResult.status === 'success' && aiResult.image_paths?.length > 0) {
        // 更新数据库，存储AI生成的结果
        photoService.updatePhoto(photo.id, {
          cartoon_url: aiResult.image_paths[0],
          status: 'completed'
        })
      } else {
        // AI处理失败
        photoService.updatePhoto(photo.id, {
          status: 'failed',
          processing_error: 'AI生成失败'
        })
      }
    } catch (error) {
      console.error('AI处理错误:', error)
      // AI服务不可用，保持pending状态，稍后可以重试
    }
    
    return NextResponse.json({
      success: true,
      photo_id: photo.id,
      photo
    })
    
  } catch (error) {
    console.error('上传失败:', error)
    return NextResponse.json(
      { success: false, error: '上传失败' },
      { status: 500 }
    )
  }
}