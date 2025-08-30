"use client";

import { useState, useRef, useCallback } from "react";
import {
  Camera,
  RotateCcw,
  Upload,
  CheckCircle,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { generateSessionId } from "@/lib/utils";
import { Photo } from "@/lib/types";

export default function PhotoApp() {
  const [step, setStep] = useState<
    | "welcome"
    | "camera"
    | "preview"
    | "caption"
    | "uploading"
    | "processing"
    | "result"
    | "error"
  >("welcome");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [userSession] = useState(() => generateSessionId());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 800, height: 600 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setStep("camera");
    } catch (error) {
      setError("无法访问摄像头，请检查权限设置");
      setStep("error");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d")!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    setCapturedImage(imageData);

    // 停止摄像头
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setStep("preview");
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const uploadPhoto = useCallback(async () => {
    if (!capturedImage) return;

    setStep("uploading");

    try {
      // 将base64转换为Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("photo", blob, "photo.jpg");
      formData.append("userSession", userSession);
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await uploadResponse.json();

      if (result.success) {
        setUploadedPhoto(result.photo);
        setStep("processing");

        // 轮询检查处理状态
        checkProcessingStatus(result.photo.id);
      } else {
        setError(result.error || "上传失败");
        setStep("error");
      }
    } catch (error) {
      setError("网络错误，请重试");
      setStep("error");
    }
  }, [capturedImage, userSession, caption]);

  const checkProcessingStatus = useCallback(async (photoId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/photo/${photoId}`);
        const result = await response.json();

        if (result.success) {
          const photo = result.photo;

          if (photo.status === "completed" && photo.cartoon_url) {
            setUploadedPhoto(photo);
            setStep("result");
          } else if (photo.status === "failed" || photo.processing_error) {
            setError(photo.processing_error || "AI处理失败");
            setStep("error");
          } else {
            // 继续等待
            setTimeout(checkStatus, 2000);
          }
        } else {
          setError("检查状态失败");
          setStep("error");
        }
      } catch (error) {
        setError("网络错误");
        setStep("error");
      }
    };

    checkStatus();
  }, []);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // 检查文件类型
      if (!file.type.startsWith("image/")) {
        setError("请选择图片文件");
        setStep("error");
        return;
      }

      // 检查文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("图片文件过大，请选择小于10MB的图片");
        setStep("error");
        return;
      }

      // 读取文件并显示预览
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        setStep("preview");
      };
      reader.onerror = () => {
        setError("文件读取失败");
        setStep("error");
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const resetApp = useCallback(() => {
    setCapturedImage(null);
    setUploadedPhoto(null);
    setError("");
    setStep("welcome");
  }, []);

  return (
    <div className="min-h-screen bg-[#FFC837] flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-none max-w-md w-full border-4 border-black">
        {/* Header */}
        <div className="bg-[#6DCACE] p-6 text-center border-b-4 border-black">
          <h1 className="text-2xl font-bold text-black">GOSIM Wonderland</h1>
          <p className="text-black mt-2">拍照生成专属卡通头像</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "welcome" && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-[#FFC837] border-4 border-black flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-black" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black mb-2">
                  选择图片方式
                </h2>
                <p className="text-black">
                  拍照或上传图片，我们会为您生成可爱的卡通头像！
                </p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={startCamera}
                  className="w-full bg-[#6DCACE] text-black py-4 px-6 border-4 border-black font-bold hover:bg-black hover:text-[#6DCACE] transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>拍照</span>
                </button>
                <button
                  onClick={handleFileSelect}
                  className="w-full bg-[#6ECACD] text-black py-4 px-6 border-4 border-black font-bold hover:bg-black hover:text-[#6ECACD] transition-colors duration-200 flex items-center justify-center space-x-2"
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

          {step === "camera" && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black border-4 border-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={capturePhoto}
                className="w-full bg-[#FFC837] text-black py-4 px-6 border-4 border-black font-bold hover:bg-black hover:text-[#FFC837] transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Camera className="w-5 h-5" />
                <span>拍照</span>
              </button>
            </div>
          )}

          {step === "preview" && capturedImage && (
            <div className="space-y-4">
              <div className="aspect-[4/3] bg-white border-4 border-black">
                <img
                  src={capturedImage}
                  alt="拍摄的照片"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={retakePhoto}
                  className="bg-[#FC6A59] text-black py-3 px-4 border-4 border-black font-bold hover:bg-black hover:text-[#FC6A59] transition-colors flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重拍</span>
                </button>
                <button
                  onClick={() => setStep("caption")}
                  className="bg-[#FFC837] text-black py-3 px-4 border-4 border-black font-bold hover:bg-black hover:text-[#FFC837] transition-colors flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>下一步</span>
                </button>
              </div>
            </div>
          )}

          {step === "caption" && (
            <div className="space-y-6">
              <div className="text-center bg-[#FFC837] p-4 border-4 border-black">
                <h3 className="text-xl font-bold text-black mb-2">
                  AI风格定制
                </h3>
                <p className="text-black text-sm font-bold">
                  告诉AI你想要什么样的卡通风格！
                </p>
              </div>

              {/* 预设风格选项 */}
              <div>
                <h4 className="text-sm font-bold text-black mb-3 bg-[#6DCACE] p-2 border-4 border-black text-center">
                  热门风格选择
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    {
                      label: "可爱萌系",
                      value: "可爱萌系风格，大眼睛，Q版比例，粉色系配色",
                      color: "#FFC837",
                    },
                    {
                      label: "酷炫潮流",
                      value: "酷炫街头风格，墨镜，潮流服装，炫酷表情",
                      color: "#FC6A59",
                    },
                    {
                      label: "温柔治愈",
                      value: "温柔治愈风格，柔和色彩，甜美笑容，温暖氛围",
                      color: "#6ECACD",
                    },
                    {
                      label: "二次元",
                      value: "日式动漫风格，精致线条，鲜艳色彩，动漫特征",
                      color: "#6DCACE",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setCaption(preset.value)}
                      className={`p-3 text-xs bg-[${preset.color}] border-4 border-black font-bold text-black hover:bg-black hover:text-[${preset.color}] transition-colors`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 自定义输入框 */}
              <div>
                <label
                  htmlFor="caption"
                  className="block text-sm font-bold text-black mb-2 bg-[#FFC837] p-2 border-4 border-black"
                >
                  自定义需求输入
                </label>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="例如：cyberpunk风格，紫色头发，戴着科技眼镜，未来感背景，霓虹灯效果..."
                  className="w-full p-4 border-4 border-black resize-none bg-white text-black focus:outline-none focus:bg-[#FFC837] text-sm font-medium"
                  rows={4}
                  maxLength={300}
                />
                <div className="flex justify-between items-center mt-2 bg-black text-[#FFC837] p-2 border-4 border-black">
                  <div className="text-xs font-bold">提示：越详细越精准</div>
                  <div className="text-xs font-bold">{caption.length}/300</div>
                </div>
              </div>

              {/* 清空按钮 */}
              {caption && (
                <button
                  onClick={() => setCaption("")}
                  className="w-full py-3 text-sm font-bold text-black bg-[#FC6A59] border-4 border-black hover:bg-black hover:text-[#FC6A59] transition-colors"
                >
                  清空重新输入
                </button>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setStep("preview")}
                  className="bg-[#6ECACD] text-black py-4 px-4 border-4 border-black font-bold hover:bg-black hover:text-[#6ECACD] transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={uploadPhoto}
                  className="bg-[#FFC837] text-black py-4 px-4 border-4 border-black font-bold hover:bg-black hover:text-[#FFC837] transition-colors"
                >
                  生成头像
                </button>
              </div>
            </div>
          )}

          {step === "uploading" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto relative animate-spin">
                <div className="absolute top-0 left-0 w-8 h-8 bg-[#FC6A59]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 bg-[#6CC8CC]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 bg-[#FFC63E]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#FD543F]"></div>
                <div className="absolute inset-2 bg-white"></div>
              </div>
              <div className="bg-[#6DCACE] p-4 border-4 border-black">
                <h3 className="text-lg font-bold text-black">上传中</h3>
                <p className="text-black font-bold">正在上传您的照片</p>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto relative animate-spin">
                <div className="absolute top-0 left-0 w-8 h-8 bg-[#FC6A59]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 bg-[#6CC8CC]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 bg-[#FFC63E]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#FD543F]"></div>
                <div className="absolute inset-2 bg-white"></div>
              </div>
              <div className="bg-[#FFC837] p-4 border-4 border-black">
                <h3 className="text-lg font-bold text-black">AI处理中</h3>
                <p className="text-black font-bold">正在为您生成专属卡通头像</p>
              </div>
            </div>
          )}

          {step === "result" && uploadedPhoto?.cartoon_url && (
            <div className="space-y-4">
              <div className="text-center bg-[#FFC837] p-4 border-4 border-black">
                <CheckCircle className="w-12 h-12 text-black mx-auto mb-2" />
                <h3 className="text-lg font-bold text-black">生成成功！</h3>
              </div>
              <div className="aspect-square bg-white border-4 border-black">
                <img
                  src={uploadedPhoto.cartoon_url}
                  alt="卡通头像"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-black text-center font-bold bg-[#6DCACE] p-3 border-4 border-black">
                您的图片已生成，稍后将在大屏幕上展示
              </p>
              <button
                onClick={resetApp}
                className="w-full bg-[#6ECACD] text-black py-4 px-6 border-4 border-black font-bold hover:bg-black hover:text-[#6ECACD] transition-colors"
              >
                再拍一张
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="text-center space-y-4">
              <div className="bg-[#fd553f] p-4 border-4 border-black">
                <AlertCircle className="w-12 h-12 text-black mx-auto mb-2" />
                <h3 className="text-lg font-bold text-black">出错了</h3>
                <p className="text-black font-bold">{error}</p>
              </div>
              <button
                onClick={resetApp}
                className="w-full bg-[#FC6A59] text-black py-4 px-6 border-4 border-black font-bold hover:bg-black hover:text-[#FC6A59] transition-colors"
              >
                重新开始
              </button>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
