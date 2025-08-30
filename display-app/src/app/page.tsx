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
    <div className="min-h-screen bg-[#FFC837] flex flex-col">
      {/* Header */}
      <header className="bg-[#6DCACE] border-b-4 border-black text-black p-6 text-center">
        <h1 className="text-4xl font-bold mb-2">GOSIM Wonderland</h1>
        <p className="text-xl font-bold">梦幻卡通展示墙</p>
        
        {/* 状态指示 */}
        <div className="flex items-center justify-center mt-4 space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-2 border-4 border-black text-sm font-bold ${
            isConnected ? 'bg-[#6CC8CC] text-black' : 'bg-[#FC6A59] text-black'
          }`}>
            <div className={`w-3 h-3 ${
              isConnected ? 'bg-black' : 'bg-black'
            }`}></div>
            <span>{isConnected ? '实时连接' : '连接断开'}</span>
          </div>
          
          <div className="bg-white border-4 border-black px-3 py-2 text-sm font-bold text-black">
            {photos.length} 张照片
          </div>
        </div>
      </header>

      {/* Main Display */}
      <main className="flex-1 flex items-center justify-center p-8">
        {error && (
          <div className="text-center">
            <div className="bg-[#FD543F] border-4 border-black text-black p-6">
              <h2 className="text-2xl font-bold mb-2">出现错误</h2>
              <p className="text-lg font-bold">{error}</p>
            </div>
          </div>
        )}

        {!error && photos.length === 0 && (
          <div className="text-center">
            <div className="bg-white border-4 border-black text-black p-12">
              <div className="w-24 h-24 mx-auto mb-6 bg-[#FFC837] border-4 border-black flex items-center justify-center">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4">欢迎来到 GOSIM Wonderland</h2>
              <p className="text-xl font-bold">
                还没有照片，快去扫码拍照生成你的专属卡通头像吧！
              </p>
            </div>
          </div>
        )}

        {!error && photos.length > 0 && currentPhoto && (
          <div className="w-full max-w-4xl">
            <div className="bg-white border-4 border-black">
              {/* 照片显示 */}
              <div className="aspect-square relative bg-white">
                <Image
                  src={currentPhoto.cartoon_url || currentPhoto.original_url}
                  alt="卡通头像"
                  fill
                  className="object-cover transition-all duration-1000"
                  priority
                />
              </div>

              {/* 照片信息 */}
              <div className="p-6 bg-[#6DCACE] border-t-4 border-black text-black text-center">
                <div className="flex items-center justify-center space-x-4 text-lg font-bold">
                  <span className="bg-[#FFC837] border-4 border-black px-4 py-2">
                    {currentIndex + 1} / {photos.length}
                  </span>
                  <span className="bg-white border-4 border-black px-4 py-2">
                    {new Date(currentPhoto.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mt-6 bg-white border-4 border-black h-6">
              <div 
                className="bg-[#FC6A59] h-full transition-all duration-100"
                style={{
                  width: `${((currentIndex + 1) / photos.length) * 100}%`
                }}
              ></div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t-4 border-black text-[#FFC837] p-4 text-center">
        <p className="text-sm font-bold">
          扫描二维码拍照，生成专属GOSIM风格卡通头像
        </p>
      </footer>
    </div>
  )
}
