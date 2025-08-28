'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Photo } from '@/lib/types'

export default function DisplayApp() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // 初始加载照片
    loadPhotos()

    // 建立SSE连接
    const eventSource = new EventSource('/api/events')
    
    eventSource.onopen = () => {
      setIsConnected(true)
      setError('')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'photos_update') {
          setPhotos(data.photos)
        } else if (data.type === 'error') {
          setError(data.message)
        }
      } catch (err) {
        console.error('SSE解析错误:', err)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      setError('连接中断，正在重连...')
    }

    return () => {
      eventSource.close()
    }
  }, [])

  // 自动轮播
  useEffect(() => {
    if (photos.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length)
    }, 6000) // 每6秒切换

    return () => clearInterval(interval)
  }, [photos.length])

  const loadPhotos = async () => {
    try {
      const response = await fetch('/api/photos?status=approved&limit=20')
      const result = await response.json()
      
      if (result.success) {
        setPhotos(result.photos)
      } else {
        setError('加载照片失败')
      }
    } catch (error) {
      setError('网络错误')
    }
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm text-white p-6 text-center">
        <h1 className="text-4xl font-bold mb-2">GOSIM Wonderland</h1>
        <p className="text-xl opacity-90">梦幻卡通展示墙</p>
        
        {/* 状态指示 */}
        <div className="flex items-center justify-center mt-4 space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-500/30' : 'bg-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span>{isConnected ? '实时连接' : '连接断开'}</span>
          </div>
          
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
            {photos.length} 张照片
          </div>
        </div>
      </header>

      {/* Main Display */}
      <main className="flex-1 flex items-center justify-center p-8">
        {error && (
          <div className="text-center">
            <div className="bg-red-500/20 backdrop-blur-sm text-white p-6 rounded-2xl">
              <h2 className="text-2xl font-bold mb-2">出现错误</h2>
              <p className="text-lg">{error}</p>
            </div>
          </div>
        )}

        {!error && photos.length === 0 && (
          <div className="text-center">
            <div className="bg-white/20 backdrop-blur-sm text-white p-12 rounded-3xl">
              <div className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4">欢迎来到 GOSIM Wonderland</h2>
              <p className="text-xl opacity-90">
                还没有照片，快去扫码拍照生成你的专属卡通头像吧！
              </p>
            </div>
          </div>
        )}

        {!error && photos.length > 0 && currentPhoto && (
          <div className="w-full max-w-4xl">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl">
              {/* 照片显示 */}
              <div className="aspect-square relative bg-white/5">
                <Image
                  src={currentPhoto.cartoon_url || currentPhoto.original_url}
                  alt="卡通头像"
                  fill
                  className="object-cover transition-all duration-1000"
                  priority
                />
                
                {/* 渐变叠加效果 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>

              {/* 照片信息 */}
              <div className="p-6 text-white text-center">
                <div className="flex items-center justify-center space-x-4 text-lg">
                  <span className="bg-white/20 px-4 py-2 rounded-full">
                    {currentIndex + 1} / {photos.length}
                  </span>
                  <span className="opacity-70">
                    {new Date(currentPhoto.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mt-6 bg-white/20 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-100"
                style={{
                  width: `${((currentIndex + 1) / photos.length) * 100}%`
                }}
              ></div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm text-white p-4 text-center">
        <p className="text-sm opacity-70">
          扫描二维码拍照，生成专属GOSIM风格卡通头像
        </p>
      </footer>
    </div>
  )
}
