'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Photo } from '@/lib/types'

export default function DisplayApp() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string>('')
  
  // 折叠状态管理
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTrueFullscreen, setIsTrueFullscreen] = useState(false)
  const [showTrueFullscreenTip, setShowTrueFullscreenTip] = useState(false)

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

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'h': // H键切换Header
          if (!isTrueFullscreen) setIsHeaderCollapsed(prev => !prev)
          break
        case 'b': // B键切换Footer (原F键改为B)
          if (!isTrueFullscreen) setIsFooterCollapsed(prev => !prev)
          break
        case 's': // S键切换Sidebar
          if (!isTrueFullscreen) setIsSidebarCollapsed(prev => !prev)
          break
        case 'a': // A键切换全部折叠
          if (!isTrueFullscreen) {
            const newState = !isFullscreen
            setIsHeaderCollapsed(newState)
            setIsFooterCollapsed(newState)
            setIsSidebarCollapsed(newState)
            setIsFullscreen(newState)
          }
          break
        case 'f': // F键真全屏
          const newTrueFullscreen = !isTrueFullscreen
          setIsTrueFullscreen(newTrueFullscreen)
          // 进入真全屏时显示提示并设置定时隐藏
          if (newTrueFullscreen) {
            setShowTrueFullscreenTip(true)
            setTimeout(() => setShowTrueFullscreenTip(false), 3000) // 3秒后隐藏提示
            // 进入真全屏时也折叠所有元素
            setIsHeaderCollapsed(true)
            setIsFooterCollapsed(true)
            setIsSidebarCollapsed(true)
          }
          break
        case 'escape': // ESC键恢复所有
          setIsTrueFullscreen(false)
          setIsHeaderCollapsed(false)
          setIsFooterCollapsed(false)
          setIsSidebarCollapsed(false)
          setIsFullscreen(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isFullscreen, isTrueFullscreen])

  const currentPhoto = photos[currentIndex]

  // 真全屏模式：完全隐藏所有界面元素
  if (isTrueFullscreen) {
    return (
      <div className="w-screen h-screen bg-black relative overflow-hidden">
        {/* 真全屏退出提示 - 只在开始3秒显示 */}
        {showTrueFullscreenTip && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-black bg-opacity-80 text-white text-sm px-4 py-2 rounded animate-pulse">
              真全屏模式 - 按F键或ESC退出
            </div>
          </div>
        )}

        {/* 主图片 - 占满整个屏幕 */}
        {photos.length > 0 && currentPhoto && (
          <div className="w-full h-full relative">
            <Image
              src={currentPhoto.cartoon_url || currentPhoto.original_url}
              alt="卡通头像"
              fill
              className="object-contain"
              priority
            />
          </div>
        )}

        {/* 无照片时的提示 */}
        {photos.length === 0 && (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-2xl font-bold mb-4">暂无照片</div>
              <div className="text-lg">按F键或ESC退出全屏</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFC837] flex flex-col relative">
      {/* 快捷键提示 - 右上角浮动 */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-black bg-opacity-75 text-white text-xs p-2 border border-white">
          <div className="font-bold mb-1">快捷键</div>
          <div>H - 折叠头部</div>
          <div>B - 折叠底部</div>
          <div>S - 折叠侧栏</div>
          <div>A - 折叠模式</div>
          <div>F - 真全屏</div>
          <div>ESC - 恢复全部</div>
        </div>
      </div>

      {/* 折叠全屏模式指示器 */}
      {isFullscreen && !isTrueFullscreen && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <div className="bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded animate-pulse">
            折叠模式 (按ESC退出或F键真全屏)
          </div>
        </div>
      )}
      {/* Header - 可折叠版 */}
      <header className={`bg-[#6DCACE] border-b-2 border-black text-black transition-all duration-500 overflow-hidden ${
        isHeaderCollapsed ? 'h-6' : 'py-1 px-4'
      }`}>
        {/* 折叠时的迷你标题栏 */}
        {isHeaderCollapsed && (
          <div className="flex items-center justify-between h-6 px-2">
            <span className="text-xs font-bold truncate">GOSIM Wonderland</span>
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 ${isConnected ? 'bg-black' : 'bg-red-600'}`}></div>
              <span className="text-xs font-bold">{photos.length}</span>
            </div>
            <button 
              onClick={() => setIsHeaderCollapsed(false)}
              className="text-xs hover:bg-black hover:text-[#6DCACE] px-1"
              title="展开 (H键)"
            >
              ▼
            </button>
          </div>
        )}
        
        {/* 完整标题栏 */}
        {!isHeaderCollapsed && (
          <>
            <div className="flex items-center justify-between">
              {/* 左侧标题 */}
              <div className="text-left">
                <h1 className="text-lg font-bold">GOSIM Wonderland</h1>
              </div>
              
              {/* 中间折叠控制按钮 */}
              <button 
                onClick={() => setIsHeaderCollapsed(true)}
                className="bg-white border-2 border-black px-2 py-1 text-xs font-bold hover:bg-black hover:text-white transition-colors"
                title="折叠 (H键)"
              >
                ▲
              </button>
              
              {/* 右侧二维码 */}
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
            
            {/* 状态指示 */}
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
          </>
        )}
      </header>

      {/* Main Display */}
      <main className={`flex-1 flex items-center justify-center transition-all duration-500 ${
        isHeaderCollapsed && isFooterCollapsed && isSidebarCollapsed 
          ? 'p-0' 
          : 'p-2'
      }`}>
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
              {/* 主照片显示区 - 自适应显示 */}
              <div className="flex-1 flex items-center justify-center">
                <div className={`bg-white border-4 border-black w-full transition-all duration-500 ${
                  // 根据折叠状态动态调整高度
                  isHeaderCollapsed && isFooterCollapsed 
                    ? 'h-screen' 
                    : isHeaderCollapsed || isFooterCollapsed
                    ? 'h-[92vh]'
                    : 'h-[85vh]'
                }`}>
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

              {/* 侧边信息栏 - 可折叠版 */}
              <div className={`flex flex-col justify-center transition-all duration-500 ${
                isSidebarCollapsed 
                  ? 'lg:w-8 w-full lg:h-auto h-8' 
                  : 'lg:w-48 w-full space-y-2'
              }`}>
                {/* 折叠时的迷你侧栏 */}
                {isSidebarCollapsed && (
                  <div className="lg:h-full lg:w-8 h-8 w-full bg-[#6DCACE] border-2 border-black flex lg:flex-col flex-row items-center justify-center">
                    <button 
                      onClick={() => setIsSidebarCollapsed(false)}
                      className="lg:rotate-90 text-xs font-bold hover:bg-black hover:text-[#6DCACE] p-1"
                      title="展开 (S键)"
                    >
                      ▶
                    </button>
                    <div className="lg:mt-2 lg:ml-0 ml-2 text-center">
                      <div className="text-xs font-bold lg:rotate-90 lg:whitespace-nowrap">
                        {currentIndex + 1}/{photos.length}
                      </div>
                    </div>
                  </div>
                )}

                {/* 完整侧栏 */}
                {!isSidebarCollapsed && (
                  <>
                    {/* 照片计数 + 折叠按钮 */}
                    <div className="bg-[#6DCACE] border-2 border-black p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">计数器</span>
                        <button 
                          onClick={() => setIsSidebarCollapsed(true)}
                          className="bg-white border border-black px-1 text-xs font-bold hover:bg-black hover:text-white"
                          title="折叠 (S键)"
                        >
                          ◀
                        </button>
                      </div>
                      <div className="bg-white border-2 border-black p-1 text-center">
                        <span className="text-sm font-bold text-black">
                          {currentIndex + 1} / {photos.length}
                        </span>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="bg-white border-2 border-black h-4">
                      <div 
                        className="bg-[#FC6A59] h-full transition-all duration-100"
                        style={{
                          width: `${((currentIndex + 1) / photos.length) * 100}%`
                        }}
                      ></div>
                    </div>

                    {/* 缩略图预览 */}
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
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer - 可折叠版 */}
      <footer className={`bg-black border-t-2 border-black text-[#FFC837] transition-all duration-500 overflow-hidden ${
        isFooterCollapsed ? 'h-4' : 'py-1 px-4'
      }`}>
        {/* 折叠时的迷你底栏 */}
        {isFooterCollapsed && (
          <div className="flex items-center justify-between h-4 px-2">
            <span className="text-xs font-bold truncate">GOSIM</span>
            <button 
              onClick={() => setIsFooterCollapsed(false)}
              className="text-xs hover:bg-[#FFC837] hover:text-black px-1"
              title="展开 (B键)"
            >
              ▲
            </button>
          </div>
        )}
        
        {/* 完整底栏 */}
        {!isFooterCollapsed && (
          <div className="text-center">
            <div className="flex items-center justify-between">
              <div></div> {/* 占位 */}
              <p className="text-xs font-bold">
                扫码拍照，生成GOSIM卡通头像
              </p>
              <button 
                onClick={() => setIsFooterCollapsed(true)}
                className="bg-[#FFC837] text-black px-2 py-0.5 text-xs font-bold hover:bg-white transition-colors"
                title="折叠 (B键)"
              >
                ▼
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
