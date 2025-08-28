'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, RotateCcw, Upload, CheckCircle, AlertCircle, ImageIcon } from 'lucide-react'
import { generateSessionId } from '@/lib/utils'
import { Photo } from '@/lib/types'

export default function PhotoApp() {
  const [step, setStep] = useState<'welcome' | 'camera' | 'preview' | 'uploading' | 'processing' | 'result' | 'error'>('welcome')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [uploadedPhoto, setUploadedPhoto] = useState<Photo | null>(null)
  const [error, setError] = useState<string>('')
  const [userSession] = useState(() => generateSessionId())
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 800, height: 600 }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
      
      setStep('camera')
    } catch (error) {
      setError('无法访问摄像头，请检查权限设置')
      setStep('error')
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')!

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    context.drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    
    setCapturedImage(imageData)
    
    // 停止摄像头
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setStep('preview')
  }, [])

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  const uploadPhoto = useCallback(async () => {
    if (!capturedImage) return

    setStep('uploading')

    try {
      // 将base64转换为Blob
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      
      const formData = new FormData()
      formData.append('photo', blob, 'photo.jpg')
      formData.append('userSession', userSession)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await uploadResponse.json()

      if (result.success) {
        setUploadedPhoto(result.photo)
        setStep('processing')
        
        // 轮询检查处理状态
        checkProcessingStatus(result.photo.id)
      } else {
        setError(result.error || '上传失败')
        setStep('error')
      }
    } catch (error) {
      setError('网络错误，请重试')
      setStep('error')
    }
  }, [capturedImage, userSession])

  const checkProcessingStatus = useCallback(async (photoId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/photo/${photoId}`)
        const result = await response.json()

        if (result.success) {
          const photo = result.photo
          
          if (photo.cartoon_url) {
            setUploadedPhoto(photo)
            setStep('result')
          } else if (photo.processing_error) {
            setError(photo.processing_error)
            setStep('error')
          } else {
            // 继续等待
            setTimeout(checkStatus, 2000)
          }
        } else {
          setError('检查状态失败')
          setStep('error')
        }
      } catch (error) {
        setError('网络错误')
        setStep('error')
      }
    }

    checkStatus()
  }, [])

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      setStep('error')
      return
    }

    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('图片文件过大，请选择小于10MB的图片')
      setStep('error')
      return
    }

    // 读取文件并显示预览
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target?.result as string
      setCapturedImage(imageData)
      setStep('preview')
    }
    reader.onerror = () => {
      setError('文件读取失败')
      setStep('error')
    }
    reader.readAsDataURL(file)
  }, [])

  const resetApp = useCallback(() => {
    setCapturedImage(null)
    setUploadedPhoto(null)
    setError('')
    setStep('welcome')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">GOSIM Wonderland</h1>
          <p className="text-pink-100 mt-2">拍照生成专属卡通头像</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">选择图片方式</h2>
                <p className="text-gray-600">拍照或上传图片，我们会为您生成可爱的卡通头像！</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={startCamera}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>拍照</span>
                </button>
                <button
                  onClick={handleFileSelect}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>上传图片</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {step === 'camera' && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={capturePhoto}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
              >
                <Camera className="w-5 h-5" />
                <span>拍照</span>
              </button>
            </div>
          )}

          {step === 'preview' && capturedImage && (
            <div className="space-y-4">
              <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={capturedImage}
                  alt="拍摄的照片"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={retakePhoto}
                  className="bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重拍</span>
                </button>
                <button
                  onClick={uploadPhoto}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>生成头像</span>
                </button>
              </div>
            </div>
          )}

          {step === 'uploading' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">上传中...</h3>
                <p className="text-gray-600">正在上传您的照片</p>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">AI处理中...</h3>
                <p className="text-gray-600">正在为您生成专属卡通头像，请耐心等待</p>
              </div>
            </div>
          )}

          {step === 'result' && uploadedPhoto?.cartoon_url && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-800">生成成功！</h3>
              </div>
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={uploadedPhoto.cartoon_url}
                  alt="卡通头像"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                您的卡通头像已生成，将在大屏幕上展示（需要审核通过）
              </p>
              <button
                onClick={resetApp}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
              >
                再拍一张
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">出错了</h3>
                <p className="text-gray-600">{error}</p>
              </div>
              <button
                onClick={resetApp}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                重新开始
              </button>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
