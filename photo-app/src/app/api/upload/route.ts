import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { PhotoService } from '@/lib/db-operations'

const photoService = new PhotoService()
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

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

    // 保存原图
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)
    
    const originalUrl = `/uploads/${fileName}`
    
    // 保存到数据库
    const photo = photoService.createPhoto(originalUrl, userSession, caption)
    
    // 异步调用FastAPI服务处理AI转换
    processWithFastAPI(photo.id, buffer, caption)
      .catch(error => {
        console.error('AI处理失败:', error)
        photoService.updatePhoto(photo.id, {
          processing_error: error.message
        })
      })
    
    return NextResponse.json({
      success: true,
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

async function processWithFastAPI(photoId: string, imageBuffer: Buffer, caption?: string) {
  try {
    const base64Image = imageBuffer.toString('base64')
    
    // 调用FastAPI服务处理图像
    const response = await fetch(`${AI_SERVICE_URL}/process-image-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: base64Image,
        caption: caption || undefined,
        user_session: undefined
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI服务返回错误: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'AI服务处理失败')
    }

    // 下载生成的卡通图像并保存到本地
    const imageDownloadResponse = await fetch(result.cartoon_url)
    if (!imageDownloadResponse.ok) {
      throw new Error('下载生成的图像失败')
    }
    
    const imageArrayBuffer = await imageDownloadResponse.arrayBuffer()
    const downloadedImageBuffer = Buffer.from(imageArrayBuffer)
    
    const cartoonFileName = `cartoon-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const cartoonPath = path.join(uploadDir, cartoonFileName)
    
    await writeFile(cartoonPath, downloadedImageBuffer)
    
    const cartoonUrl = `/uploads/${cartoonFileName}`
    
    // 更新数据库
    photoService.updatePhoto(photoId, {
      cartoon_url: cartoonUrl,
      ai_description: result.ai_description
    })
    
  } catch (error) {
    console.error('FastAPI处理详细错误:', error)
    throw new Error(`AI处理失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}