import { NextRequest } from 'next/server'
import { PhotoService } from '@/lib/db-operations'

const photoService = new PhotoService()

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // 发送连接建立消息
      controller.enqueue(encoder.encode('data: {"type": "connected"}\n\n'))
      
      // 定期检查新照片
      const interval = setInterval(() => {
        try {
          const newPhotos = photoService.getPhotosByStatus('approved', 10)
          const data = JSON.stringify({
            type: 'photos_update',
            photos: newPhotos
          })
          
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch (error) {
          console.error('SSE error:', error)
          controller.enqueue(encoder.encode(`data: {"type": "error", "message": "获取数据失败"}\n\n`))
        }
      }, 3000) // 每3秒检查一次
      
      // 清理函数
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    }
  })
}