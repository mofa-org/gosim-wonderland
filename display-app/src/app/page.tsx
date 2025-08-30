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
      <header className="bg-[#6DCACE] border-b-4 border-black text-black py-3 px-6 text-center">
        <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-1">GOSIM Wonderland</h1>
        <p className="text-base lg:text-lg xl:text-xl font-bold">梦幻卡通展示墙</p>
        
        {/* 状态指示 */}
        <div className="flex items-center justify-center mt-4 space-x-6">
          <div className={`flex items-center space-x-3 px-4 py-3 border-4 border-black text-base lg:text-lg font-bold ${
            isConnected ? 'bg-[#6CC8CC] text-black' : 'bg-[#FC6A59] text-black'
          }`}>
            <div className={`w-4 h-4 lg:w-5 lg:h-5 ${
              isConnected ? 'bg-black' : 'bg-black'
            }`}></div>
            <span>{isConnected ? '实时连接' : '连接断开'}</span>
          </div>
          
          <div className="bg-white border-4 border-black px-4 py-3 text-base lg:text-lg font-bold text-black">
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
            <div className="w-full max-w-7xl h-full flex flex-col lg:flex-row gap-8">
              {/* 主照片显示区 - 横屏时占用更多空间 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-white border-4 border-black max-h-[70vh] w-full">
                  <div className="aspect-square lg:aspect-[4/3] xl:aspect-[16/10] relative bg-white">
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

              {/* 侧边信息栏 - 横屏时显示在右侧 */}
              <div className="lg:w-80 xl:w-96 flex flex-col justify-center space-y-6">
                {/* 照片信息 */}
                <div className="bg-[#6DCACE] border-4 border-black p-6">
                  <h3 className="text-2xl font-bold text-black mb-4 text-center">照片信息</h3>
                  <div className="space-y-3">
                    <div className="bg-white border-4 border-black p-3 text-center">
                      <span className="text-lg font-bold text-black">
                        {currentIndex + 1} / {photos.length}
                      </span>
                    </div>
                    <div className="bg-[#FFC837] border-4 border-black p-3 text-center">
                      <span className="text-sm font-bold text-black">
                        {new Date(currentPhoto.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="bg-white border-4 border-black h-8">
                  <div 
                    className="bg-[#FC6A59] h-full transition-all duration-100 flex items-center justify-end pr-2"
                    style={{
                      width: `${((currentIndex + 1) / photos.length) * 100}%`
                    }}
                  >
                    <span className="text-black text-xs font-bold">
                      {Math.round(((currentIndex + 1) / photos.length) * 100)}%
                    </span>
                  </div>
                </div>

                {/* 缩略图预览 */}
                <div className="bg-white border-4 border-black p-4">
                  <h4 className="text-lg font-bold text-black mb-3 text-center">预览</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.slice(0, 9).map((photo, index) => (
                      <div 
                        key={photo.id}
                        className={`aspect-square relative border-2 ${
                          index === currentIndex ? 'border-[#FC6A59]' : 'border-black'
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

                {/* 二维码区域 */}
                <div className="bg-[#6DCACE] border-4 border-black p-4">
                  <h4 className="text-lg font-bold text-black mb-3 text-center">扫码拍照</h4>
                  <div className="w-32 h-32 mx-auto bg-white border-4 border-black p-2">
                    <Image
                      src="/qr-code.png"
                      alt="扫描二维码拍照"
                      width={112}
                      height={112}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs font-bold text-black text-center mt-2">
                    扫码生成卡通头像
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t-4 border-black text-[#FFC837] py-3 px-8 text-center">
        <p className="text-sm lg:text-base xl:text-lg font-bold">
          扫描二维码拍照，生成专属GOSIM风格卡通头像
        </p>
      </footer>
    </div>
  )
}
