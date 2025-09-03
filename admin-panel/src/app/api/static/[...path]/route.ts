import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { lookup } from 'mime-types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params
    const filePath = resolvedParams.path.join('/')
    const fullPath = path.join(process.cwd(), '..', filePath)
    
    // 安全检查：防止路径遍历攻击
    const normalizedPath = path.normalize(fullPath)
    const basePath = path.join(process.cwd(), '..')
    
    if (!normalizedPath.startsWith(basePath)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    // 读取文件
    const fileBuffer = await readFile(normalizedPath)
    
    // 获取MIME类型
    const mimeType = lookup(normalizedPath) || 'application/octet-stream'
    
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
    
  } catch (error) {
    console.error('Static file error:', error)
    return new NextResponse('Not Found', { status: 404 })
  }
}