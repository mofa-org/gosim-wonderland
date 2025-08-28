import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { PhotoService } from '@/lib/db-operations'
import OpenAI from 'openai'

const photoService = new PhotoService()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File
    const userSession = formData.get('userSession') as string

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
    const photo = photoService.createPhoto(originalUrl, userSession)
    
    // 异步处理AI转换
    processWithAI(photo.id, buffer)
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

async function processWithAI(photoId: string, imageBuffer: Buffer) {
  try {
    const base64Image: string = imageBuffer.toString('base64')
    
    // 第一步：使用GPT-4 Vision分析图片，生成详细描述
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请详细描述这张照片中人物的特征，包括：面部特征、发型、表情、姿势、服装等。用英文回答，控制在100词以内。"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 150
    })

    const description = analysisResponse.choices[0]?.message?.content || "a person"
    
    // 第二步：基于描述使用DALL-E 3生成卡通图像
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a cute cartoon avatar in GOSIM style based on: ${description}. 
        Style requirements: 
        - Bright pastel colors (macaroon color palette)
        - Simplified but adorable cartoon style
        - Clean lines and cute proportions
        - Maintain the person's key facial features and expression
        - Simple solid color background
        - High quality, professional cartoon illustration`,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    })

    const generatedImageUrl = imageResponse.data?.[0]?.url
    
    if (!generatedImageUrl) {
      throw new Error('未能生成图像')
    }

    // 第三步：下载生成的图像并保存到本地
    const imageDownloadResponse = await fetch(generatedImageUrl)
    const imageArrayBuffer = await imageDownloadResponse.arrayBuffer()
    const downloadedImageBuffer = Buffer.from(imageArrayBuffer)
    
    const cartoonFileName = `cartoon-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const cartoonPath = path.join(uploadDir, cartoonFileName)
    
    await writeFile(cartoonPath, downloadedImageBuffer)
    
    const cartoonUrl = `/uploads/${cartoonFileName}`
    
    // 更新数据库
    photoService.updatePhoto(photoId, {
      cartoon_url: cartoonUrl
    })
    
  } catch (error) {
    console.error('AI处理详细错误:', error)
    throw new Error(`AI处理失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}