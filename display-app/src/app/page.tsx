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
      {/* Header - 压缩版 */}
      <header className="bg-[#6DCACE] border-b-2 border-black text-black py-1 px-4">
        <div className="flex items-center justify-between">
          {/* 左侧标题 - 缩小 */}
          <div className="text-left">
            <h1 className="text-lg font-bold">GOSIM Wonderland</h1>
          </div>
          
          {/* 右侧二维码 - 缩小 */}
          <div className="bg-white border-2 border-black p-1">
            <Image
              src="/qr-code.png"
              alt="扫描二维码拍照"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
            />
          </div>
        </div>
        
        {/* 状态指示 - 缩小并简化 */}
        <div className="flex items-center justify-center mt-1 space-x-3">
          <div className={`flex items-center space-x-1 px-2 py-1 border-2 border-black text-xs font-bold ${
            isConnected ? 'bg-[#6CC8CC] text-black' : 'bg-[#FC6A59] text-black'
          }`}>
            <div className={`w-2 h-2 ${
              isConnected ? 'bg-black' : 'bg-black'
            }`}></div>
            <span>{isConnected ? '连接' : '断开'}</span>
          </div>
          
          <div className="bg-white border-2 border-black px-2 py-1 text-xs font-bold text-black">
            {photos.length} 张
          </div>
        </div>
      </header>

      {/* Main Display */}
      <main className="flex-1 flex items-center justify-center p-2">
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
              <h2 className="text-3xl font-bold mb-6">欢迎来到 GOSIM Wonderland</h2>
              
              {/* 二维码区域 */}
              <div className="mb-6">
                <div className="w-48 h-48 mx-auto bg-white border-4 border-black p-4">
                  <Image
                    src="/qr-code.png"
                    alt="扫描二维码拍照"
                    width={176}
                    height={176}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              
              <p className="text-xl font-bold">
                扫描上方二维码拍照生成你的专属卡通头像！
              </p>
            </div>
          </div>
        )}

        {!error && photos.length > 0 && currentPhoto && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-full flex flex-col lg:flex-row gap-2">
              {/* 主照片显示区 - 超大显示 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-white border-4 border-black w-full h-[85vh]">
                  <div className="w-full h-full relative bg-white">
                    <Image
                      src={currentPhoto.cartoon_url || currentPhoto.original_url}
                      alt="卡通头像"
                      fill
                      className="object-contain transition-all duration-1000"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* 侧边信息栏 - 极简版 */}
              <div className="lg:w-48 flex flex-col justify-center space-y-2">
                {/* 照片计数 - 简化 */}
                <div className="bg-[#6DCACE] border-2 border-black p-2">
                  <div className="bg-white border-2 border-black p-1 text-center">
                    <span className="text-sm font-bold text-black">
                      {currentIndex + 1} / {photos.length}
                    </span>
                  </div>
                </div>

                {/* 进度条 - 缩小 */}
                <div className="bg-white border-2 border-black h-4">
                  <div 
                    className="bg-[#FC6A59] h-full transition-all duration-100"
                    style={{
                      width: `${((currentIndex + 1) / photos.length) * 100}%`
                    }}
                  ></div>
                </div>

                {/* 缩略图预览 - 超小版 */}
                <div className="bg-white border-2 border-black p-1">
                  <div className="grid grid-cols-2 gap-1">
                    {photos.slice(0, 4).map((photo, index) => (
                      <div 
                        key={photo.id}
                        className={`aspect-square relative border ${
                          index === currentIndex ? 'border-[#FC6A59] border-2' : 'border-black'
                        }`}
                      >
                        <Image
                          src={photo.cartoon_url || photo.original_url}
                          alt="预览"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer - 极简版 */}
      <footer className="bg-black border-t-2 border-black text-[#FFC837] py-1 px-4 text-center">
        <p className="text-xs font-bold">
          扫码拍照，生成GOSIM卡通头像
        </p>
      </footer>
    </div>
  )
}
