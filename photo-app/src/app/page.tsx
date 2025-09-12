"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Camera,
  RotateCcw,
  Upload,
  CheckCircle,
  AlertCircle,
  Film,
  Github,
  ExternalLink,
} from "lucide-react";
import { generateSessionId } from "@/lib/utils";
import { Photo } from "@/lib/types";

function PhotoApp() {
  const [step, setStep] = useState<
    | "welcome"
    | "camera"
    | "camera_loading"
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
  const [userSession, setUserSession] = useState<string>("");
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [useAI, setUseAI] = useState<boolean>(true); // 用户选择是否使用AI处理
  const [cameraSupported, setCameraSupported] = useState<boolean>(true); // 摄像头是否支持

  useEffect(() => {
    // 在客户端生成sessionId，避免SSR不匹配
    setUserSession(generateSessionId());
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      // 检查域名，如果是wonderland.mofa.ai则重定向到HTTPS域名
      if (location.hostname === "wonderland.mofa.ai") {
        console.log(
          "检测到wonderland.mofa.ai域名，重定向到HTTPS域名以支持摄像头功能",
        );
        window.location.href = `https://test.liyao.space${location.pathname}${location.search}`;
        return;
      }

      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "您的浏览器不支持摄像头功能，请使用现代浏览器或检查是否为HTTPS连接",
        );
      }

      // 检查是否为安全上下文（HTTPS或localhost）
      if (
        location.protocol !== "https:" &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
      ) {
        throw new Error(
          "摄像头功能需要HTTPS连接，请使用HTTPS访问或在本地环境测试",
        );
      }

      // 清理之前的stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      console.log("开始请求摄像头权限...");

      // 先切换到camera状态，让video元素渲染
      setStep("camera");
      setIsVideoReady(false);

      // 获取摄像头流
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 800 },
          height: { ideal: 600 },
        },
        audio: false,
      });

      console.log("摄像头权限获取成功", stream);
      streamRef.current = stream;

      // 使用setInterval等待video元素渲染完成
      const waitForVideo = () => {
        return new Promise<HTMLVideoElement>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50; // 5秒超时

          const checkVideo = () => {
            if (videoRef.current) {
              console.log("找到video元素");
              resolve(videoRef.current);
            } else if (attempts >= maxAttempts) {
              reject(new Error("等待视频元素超时"));
            } else {
              attempts++;
              setTimeout(checkVideo, 100);
            }
          };

          checkVideo();
        });
      };

      const video = await waitForVideo();
      video.srcObject = stream;

      // 等待视频准备就绪
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          console.log("视频元数据加载完成");
          video
            .play()
            .then(() => {
              console.log("视频开始播放成功");
              setIsVideoReady(true);
              resolve();
            })
            .catch((playError) => {
              console.error("视频播放失败:", playError);
              reject(playError);
            });
        };

        const onError = (error: Event) => {
          console.error("视频元素错误:", error);
          reject(new Error("视频元素加载失败"));
        };

        // 添加事件监听器
        video.addEventListener("loadedmetadata", onLoadedMetadata, {
          once: true,
        });
        video.addEventListener("error", onError, { once: true });

        // 5秒超时
        setTimeout(() => {
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.removeEventListener("error", onError);
          reject(new Error("视频加载超时"));
        }, 5000);
      });
    } catch (error) {
      console.error("摄像头启动失败:", error);

      // 清理资源
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setError(
        `无法启动摄像头：${error instanceof Error ? error.message : "未知错误"}`,
      );
      setStep("error");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      console.error("视频未准备就绪，无法拍照");
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      console.error("无法获取canvas context");
      return;
    }

    // 确保视频有尺寸
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("视频尺寸无效", {
        width: video.videoWidth,
        height: video.videoHeight,
      });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 水平翻转画布（因为前置摄像头）
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    console.log("拍照成功，图片大小:", imageData.length);

    setCapturedImage(imageData);

    // 停止摄像头
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsVideoReady(false);

    setStep("preview");
  }, [isVideoReady]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const uploadPhoto = useCallback(async () => {
    if (!capturedImage || !userSession) return;

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
      formData.append("useAI", useAI.toString());

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await uploadResponse.json();

      if (result.success) {
        setUploadedPhoto(result.photo);

        if (useAI) {
          setStep("processing");
          // 轮询检查处理状态
          checkProcessingStatus(result.photo.id);
        } else {
          // 用户选择保持原样，直接跳到结果页面
          setStep("result");
        }
      } else {
        setError(result.error || "请稍后重试，可能是服务器繁忙");
        setStep("error");
      }
    } catch (error) {
      setError("网络繁忙，请稍后重试");
      setStep("error");
    }
  }, [capturedImage, userSession, caption, useAI]);

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
            // 友好化错误信息
            let friendlyError =
              "请重试一下，可能遇到了以下情况：\n• 服务器正在高峰期\n• 照片可能包含敏感内容\n• 网络连接不稳定";

            if (photo.processing_error) {
              const errorMsg = photo.processing_error.toLowerCase();
              if (
                errorMsg.includes("sensitive") ||
                errorMsg.includes("违规") ||
                errorMsg.includes("敏感")
              ) {
                friendlyError = "照片可能包含敏感内容，请尝试其他照片";
              } else if (
                errorMsg.includes("timeout") ||
                errorMsg.includes("超时")
              ) {
                friendlyError = "服务器响应较慢，请稍后重试";
              } else if (
                errorMsg.includes("rate") ||
                errorMsg.includes("限制")
              ) {
                friendlyError = "当前访问量较大，请稍等片刻再试";
              }
            }

            setError(friendlyError);
            setStep("error");
          } else {
            // 继续等待
            setTimeout(checkStatus, 2000);
          }
        } else {
          setError("连接不稳定，请稍后重试");
          setStep("error");
        }
      } catch (error) {
        setError("网络连接不稳定，请检查网络后重试");
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
          <p className="text-black mt-2"></p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "welcome" && (
            <div className="text-center space-y-6">
              <div
                onClick={handleFileSelect}
                className="w-24 h-24 mx-auto bg-[#FFC837] border-4 border-black flex items-center justify-center cursor-pointer hover:bg-black hover:text-[#FFC837] transition-colors duration-200 group"
              >
                <Film className="w-12 h-12 text-black group-hover:text-[#FFC837] transition-colors duration-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black mb-2">
                  点击上传图片
                </h2>
                <p className="text-black">为您生成专属个性图片</p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={startCamera}
                  className="w-full bg-[#6DCACE] text-black py-4 px-6 border-4 border-black font-bold hover:bg-black hover:text-[#6DCACE] transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>拍照</span>
                </button>
                <a
                  href="http://wonderland.mofa.ai:8081"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#FC6A59] text-black py-4 px-6 border-4 border-black font-bold hover:bg-black hover:text-[#FC6A59] transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>查看大屏展示</span>
                </a>
                <button
                  onClick={handleFileSelect}
                  className="hidden w-full bg-[#6ECACD] text-black py-4 px-6 border-4 border-black font-bold hover:bg-black hover:text-[#6ECACD] transition-colors duration-200 flex items-center justify-center space-x-2"
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

          {step === "camera_loading" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto relative animate-spin">
                <div className="absolute top-0 left-0 w-8 h-8 bg-[#6DCACE]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 bg-[#FFC837]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 bg-[#FC6A59]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#6ECACD]"></div>
                <div className="absolute inset-2 bg-white"></div>
              </div>
              <div className="bg-[#6DCACE] p-4 border-4 border-black">
                <h3 className="text-lg font-bold text-black">启动摄像头</h3>
                <p className="text-black font-bold">正在准备拍照环境...</p>
              </div>
            </div>
          )}

          {step === "camera" && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black border-4 border-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  controls={false}
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </div>
              <button
                onClick={capturePhoto}
                disabled={!isVideoReady}
                className={`w-full py-4 px-6 border-4 border-black font-bold transition-colors duration-200 flex items-center justify-center space-x-2 ${
                  isVideoReady
                    ? "bg-[#FFC837] text-black hover:bg-black hover:text-[#FFC837]"
                    : "bg-gray-400 text-gray-600 cursor-not-allowed"
                }`}
              >
                <Camera className="w-5 h-5" />
                <span>{isVideoReady ? "拍照" : "准备中..."}</span>
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
              {/* AI风格定制选项 - 只在选择AI处理时显示 */}
              {useAI && (
                <div className="bg-[#FFC837] p-4 border-4 border-black">
                  <h3 className="text-lg font-bold text-black mb-2 text-center">
                    AI风格定制
                  </h3>
                  <p className="text-black text-sm font-bold text-center">
                    告诉AI你想要什么样的卡通风格！
                  </p>
                </div>
              )}

              {/* 预设风格选项 - 只在选择AI处理时显示 */}
              {useAI && (
                <div>
                  <h4 className="text-sm font-bold text-black mb-3 bg-[#6DCACE] p-2 border-4 border-black text-center">
                    热门风格选择
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      {
                        label: "科技极客",
                        value:
                          "科技感十足的卡通风格，突出程序员气质，代码元素背景，现代简洁",
                        color: "#FFC837",
                      },
                      {
                        label: "专业商务",
                        value:
                          "专业会议风格，正式但有趣，保持职场精英形象，商务色调",
                        color: "#FC6A59",
                      },
                      {
                        label: "创新活力",
                        value:
                          "充满创新活力的风格，年轻化表达，鲜明色彩，体现开发者激情",
                        color: "#6ECACD",
                      },
                      {
                        label: "简约现代",
                        value:
                          "简约现代的卡通风格，线条清晰，色彩和谐，突出科技会议氛围",
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
                      placeholder="例如：程序员卡通形象，戴着程序员帽，背景有代码屏幕，科技蓝色调，体现GOSIM大会氛围..."
                      className="w-full p-4 border-4 border-black resize-none bg-white text-black focus:outline-none focus:bg-[#FFC837] text-sm font-medium"
                      rows={4}
                      maxLength={300}
                    />
                    <div className="flex justify-between items-center mt-2 bg-black text-[#FFC837] p-2 border-4 border-black">
                      <div className="text-xs font-bold">
                        提示：越详细越精准
                      </div>
                      <div className="text-xs font-bold">
                        {caption.length}/300
                      </div>
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
                </div>
              )}

              {/* AI处理选择 */}
              <div className="text-center space-y-4">
                <div className="bg-[#FFC837] p-4 border-4 border-black">
                  <h3 className="text-xl font-bold text-black mb-2">
                    选择处理方式
                  </h3>
                  <p className="text-black text-sm font-bold">
                    您希望如何处理您的照片？
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setUseAI(true)}
                    className={`p-4 border-4 border-black font-bold transition-colors ${
                      useAI
                        ? "bg-[#6DCACE] text-black"
                        : "bg-white text-black hover:bg-[#6DCACE]"
                    }`}
                  >
                    <div className="text-sm font-bold">AI卡通化</div>
                    <div className="text-xs mt-1">生成卡通风格</div>
                  </button>

                  <button
                    onClick={() => setUseAI(false)}
                    className={`p-4 border-4 border-black font-bold transition-colors ${
                      !useAI
                        ? "bg-[#6DCACE] text-black"
                        : "bg-white text-black hover:bg-[#6DCACE]"
                    }`}
                  >
                    <div className="text-sm font-bold">保持原样</div>
                    <div className="text-xs mt-1">直接显示原图</div>
                  </button>
                </div>
              </div>

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
                  {useAI ? "生成" : "上传展示"}
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
                <h3 className="text-lg font-bold text-black">
                  {useAI ? "AI处理中" : "处理中"}
                </h3>
                <p className="text-black font-bold">
                  {useAI ? "正在为您生成专属卡通形象" : "正在处理您的照片"}
                </p>
              </div>
            </div>
          )}

          {step === "result" && uploadedPhoto && (
            <div className="space-y-4">
              <div className="text-center bg-[#FFC837] p-4 border-4 border-black">
                <CheckCircle className="w-12 h-12 text-black mx-auto mb-2" />
                <h3 className="text-lg font-bold text-black">
                  {useAI && uploadedPhoto.cartoon_url
                    ? "生成成功！"
                    : "上传成功！"}
                </h3>
              </div>
              <div className="aspect-square bg-white border-4 border-black">
                <img
                  src={uploadedPhoto.cartoon_url || uploadedPhoto.original_url}
                  alt={useAI ? "卡通形象" : "原图"}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-black text-center font-bold bg-[#6DCACE] p-3 border-4 border-black">
                您的图片已上传，稍后将在大屏幕上展示
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
              <div className="bg-[#FFE4B5] p-4 border-4 border-black">
                <AlertCircle className="w-12 h-12 text-[#D2691E] mx-auto mb-2" />
                <h3 className="text-lg font-bold text-[#8B4513]">请稍等</h3>
                <p className="text-[#8B4513] font-medium whitespace-pre-line">
                  {error}
                </p>
              </div>
              <button
                onClick={resetApp}
                className="w-full bg-[#DEB887] text-[#8B4513] py-4 px-6 border-4 border-black font-bold hover:bg-[#8B4513] hover:text-[#DEB887] transition-colors"
              >
                重新尝试
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 bg-white border-4 border-black max-w-md w-full">
        <div className="p-4 text-center">
          <div className="text-sm font-bold text-black mb-3">
            Powered by <span className="text-[#6DCACE]">mofa.ai</span>
          </div>
          <div className="flex justify-center space-x-2">
            <a
              href="https://mofa.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 bg-[#6DCACE] text-black px-3 py-2 border-2 border-black font-bold hover:bg-black hover:text-[#6DCACE] transition-colors text-xs"
            >
              <ExternalLink className="w-3 h-3" />
              <span>mofa.ai</span>
            </a>
            <a
              href="https://github.com/mofa-org/mofa"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 bg-[#FFC837] text-black px-3 py-2 border-2 border-black font-bold hover:bg-black hover:text-[#FFC837] transition-colors text-xs"
            >
              <Github className="w-3 h-3" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// 禁用SSR以避免水合错误
export default dynamic(() => Promise.resolve(PhotoApp), { ssr: false });
