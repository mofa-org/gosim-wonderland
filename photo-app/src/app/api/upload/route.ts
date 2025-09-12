import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { PhotoService } from '@/lib/db-operations'
import sharp from 'sharp'

const photoService = new PhotoService()

// 图片压缩到480p配置
const MAX_WIDTH = 640
const MAX_HEIGHT = 480
const JPEG_QUALITY = 85

// 压缩图片到480p
async function compressImageTo480p(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer)
    const metadata = await image.metadata()
    
    console.log(`📏 原图尺寸: ${metadata.width}x${metadata.height}`)
    
    // 计算压缩后的尺寸（保持宽高比）
    let newWidth = metadata.width!
    let newHeight = metadata.height!
    
    if (newWidth > MAX_WIDTH || newHeight > MAX_HEIGHT) {
      const widthRatio = MAX_WIDTH / newWidth
      const heightRatio = MAX_HEIGHT / newHeight
      const ratio = Math.min(widthRatio, heightRatio)
      
      newWidth = Math.round(newWidth * ratio)
      newHeight = Math.round(newHeight * ratio)
    }
    
    console.log(`📐 压缩后尺寸: ${newWidth}x${newHeight}`)
    
    // 压缩图片
    const compressedBuffer = await image
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    
    const originalSize = buffer.length
    const compressedSize = compressedBuffer.length
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
    
    console.log(`🗜️ 文件大小: ${(originalSize/1024/1024).toFixed(2)}MB → ${(compressedSize/1024/1024).toFixed(2)}MB (压缩${compressionRatio}%)`)
    
    return compressedBuffer
  } catch (error) {
    console.error('图片压缩失败:', error)
    return buffer // 压缩失败时返回原图
  }
}

// 构建优化的AI prompt
function buildOptimizedPrompt(userCaption: string): string {
  // 基础的杭州GOSIM开源主题prompt
  const basePrompt = "卡通风格，GOSIM开发者大会风格，杭州科技氛围，开源精神体现，现代简洁设计"
  
  if (!userCaption || userCaption.trim() === '') {
    // 如果用户没有输入，使用增强的默认prompt
    return `${basePrompt}，专业程序员形象，科技感十足，代码元素背景，体现开发者气质和创新精神`
  }
  
  // 如果用户有输入，结合用户需求和主题
  return `${userCaption}，${basePrompt}，结合GOSIM大会特色，突出开源社区氛围`
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File
    const userSession = formData.get('userSession') as string
    const caption = formData.get('caption') as string
    const useAI = formData.get('useAI') === 'true' // 用户选择是否使用AI

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

    // 处理图片：压缩到480p以提高AI处理速度
    const bytes = await file.arrayBuffer()
    const originalBuffer = Buffer.from(bytes)
    
    console.log(`📤 开始处理上传的图片: ${file.name}`)
    
    // 压缩图片到480p
    const compressedBuffer = await compressImageTo480p(originalBuffer)
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
    const uploadDir = path.join(process.cwd(), '..', 'original-photos')
    
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, compressedBuffer)
    
    console.log(`✅ 图片已保存: ${fileName}`)
    
    const originalUrl = `/original-photos/${fileName}`
    
    // 存储到数据库
    const photo = photoService.createPhoto(originalUrl, userSession, caption)
    
    // 根据用户选择决定是否调用AI服务
    if (useAI) {
      // 用户选择AI处理
      try {
        const aiResponse = await fetch('http://127.0.0.1:8000/generate-image/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model_name: 'qwen-image-edit',
            prompt: buildOptimizedPrompt(caption),
            base_image_url: `http://localhost:80${originalUrl}`
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
    } else {
      // 用户选择直接显示原图，不使用AI处理
      photoService.updatePhoto(photo.id, {
        status: 'completed' // 直接标记为完成，display-app会显示original_url
      })
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