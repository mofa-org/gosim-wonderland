"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Check, X, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import { Photo, PhotoStatus } from "@/lib/types";

interface Stats {
  pending: number;
  completed: number;
  failed: number;
  approved: number;
  rejected: number;
}

export default function AdminPanel() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    completed: 0,
    failed: 0,
    approved: 0,
    rejected: 0,
  });
  const [currentTab, setCurrentTab] = useState<PhotoStatus>("completed");
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  // 登录状态管理
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // 登录验证函数
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "mofagosim") {
      setIsAuthenticated(true);
      setLoginError("");
      // 登录成功后存储到localStorage（可选）
      localStorage.setItem("admin_authenticated", "true");
    } else {
      setLoginError("密码错误，请重试");
      setPassword("");
    }
  };

  // 退出登录
  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    localStorage.removeItem("admin_authenticated");
  };

  // 检查localStorage中的登录状态（可选）
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("admin_authenticated");
    if (isLoggedIn === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPhotos();
      // 定期刷新
      const interval = setInterval(loadPhotos, 5000);
      return () => clearInterval(interval);
    }
  }, [currentTab, isAuthenticated]);

  const loadPhotos = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/photos?status=${currentTab}&limit=50`,
      );
      const result = await response.json();

      if (result.success) {
        setPhotos(result.photos);
        setStats(result.stats);
      } else {
        alert("加载失败: " + result.error);
      }
    } catch (error) {
      alert("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (photoId: string) => {
    if (processingIds.has(photoId)) return;

    // 获取被通过照片的当前状态
    const photoToApprove = photos.find(p => p.id === photoId);
    if (!photoToApprove) return;

    setProcessingIds((prev) => new Set(prev).add(photoId));

    try {
      const response = await fetch(`/api/admin/approve/${photoId}`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        // 从当前列表中移除
        setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
        
        // 根据原始状态正确更新统计
        setStats((prev) => {
          const newStats = { ...prev };
          
          // 减少原状态的计数
          if (photoToApprove.status === 'pending') {
            newStats.pending = prev.pending - 1;
          } else if (photoToApprove.status === 'completed') {
            newStats.completed = prev.completed - 1;
          } else if (photoToApprove.status === 'failed') {
            newStats.failed = prev.failed - 1;
          } else if (photoToApprove.status === 'rejected') {
            newStats.rejected = prev.rejected - 1;
          }
          
          // 增加approved计数
          newStats.approved = prev.approved + 1;
          
          return newStats;
        });
      } else {
        alert("操作失败: " + result.error);
      }
    } catch (error) {
      alert("网络错误");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  const handleReject = async (photoId: string) => {
    if (processingIds.has(photoId)) return;

    // 获取被删除照片的当前状态
    const photoToDelete = photos.find(p => p.id === photoId);
    if (!photoToDelete) return;

    setProcessingIds((prev) => new Set(prev).add(photoId));

    try {
      const response = await fetch(`/api/admin/approve/${photoId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        // 从当前列表中移除
        setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
        
        // 根据原始状态正确更新统计
        setStats((prev) => {
          const newStats = { ...prev };
          
          // 减少原状态的计数
          if (photoToDelete.status === 'pending') {
            newStats.pending = prev.pending - 1;
          } else if (photoToDelete.status === 'completed') {
            newStats.completed = prev.completed - 1;
          } else if (photoToDelete.status === 'failed') {
            newStats.failed = prev.failed - 1;
          } else if (photoToDelete.status === 'approved') {
            newStats.approved = prev.approved - 1;
          }
          
          // 增加rejected计数
          newStats.rejected = prev.rejected + 1;
          
          return newStats;
        });
      } else {
        alert("操作失败: " + result.error);
      }
    } catch (error) {
      alert("网络错误");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  const getTabIcon = (tab: PhotoStatus) => {
    switch (tab) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getTabName = (tab: PhotoStatus) => {
    switch (tab) {
      case "pending":
        return "处理中";
      case "completed":
        return "待审核";
      case "failed":
        return "处理失败";
      case "approved":
        return "已通过";
      case "rejected":
        return "已拒绝";
    }
  };

  // 如果未登录，显示登录界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFC837] flex items-center justify-center">
        <div className="bg-white border-4 border-black p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-black mb-2">
              GOSIM Wonderland 管理后台
            </h1>
            <p className="text-black font-bold">请输入管理密码</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 border-4 border-black font-bold text-black placeholder-gray-500 focus:outline-none focus:bg-[#FFC837]"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="bg-[#FD543F] border-4 border-black p-3">
                <p className="text-black font-bold text-center">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#6DCACE] text-black py-3 px-4 border-4 border-black font-bold hover:bg-black hover:text-[#6DCACE] transition-colors"
            >
              登录
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-black">
              🔒 安全提示：请妥善保管管理密码
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFC837]">
      {/* Header */}
      <header className="bg-[#6DCACE] border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">
                GOSIM Wonderland 管理后台
              </h1>
              <p className="text-black mt-1 font-bold">照片审核与管理</p>
            </div>

            <button
              onClick={loadPhotos}
              disabled={loading}
              className="flex items-center space-x-2 bg-[#FFC837] text-black px-4 py-2 border-4 border-black font-bold hover:bg-black hover:text-[#FFC837] transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>刷新</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            {(["pending", "completed", "failed", "approved", "rejected"] as PhotoStatus[]).map(
              (status) => (
                <div key={status} className="bg-white border-4 border-black p-4">
                  <div className="flex items-center space-x-2 text-black">
                    {getTabIcon(status)}
                    <span className="text-xs font-bold">{getTabName(status)}</span>
                  </div>
                  <div className="text-2xl font-bold mt-1 text-black">{stats[status]}</div>
                </div>
              ),
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="border-b-4 border-black">
          <nav className="flex space-x-2">
            {(["completed", "pending", "failed", "approved", "rejected"] as PhotoStatus[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`flex items-center space-x-2 py-4 px-3 border-4 border-black font-bold text-xs ${
                    currentTab === tab
                      ? "bg-black text-[#FFC837]"
                      : "bg-white text-black hover:bg-black hover:text-white"
                  }`}
                >
                  {getTabIcon(tab)}
                  <span>{getTabName(tab)}</span>
                  <span className="bg-[#FC6A59] text-black px-2 py-1 text-xs font-bold">
                    {stats[tab]}
                  </span>
                </button>
              ),
            )}
          </nav>
        </div>
      </div>

      {/* Photos Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && photos.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto relative animate-spin">
              <div className="absolute top-0 left-0 w-8 h-8 bg-[#FC6A59]"></div>
              <div className="absolute top-0 right-0 w-8 h-8 bg-[#6CC8CC]"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 bg-[#FFC63E]"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#FD543F]"></div>
              <div className="absolute inset-2 bg-white"></div>
            </div>
            <p className="text-black font-bold mt-4 bg-white border-4 border-black p-3">加载中...</p>
          </div>
        )}

        {!loading && photos.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white border-4 border-black p-8">
              <h3 className="text-lg font-bold text-black mb-2">
                暂无{getTabName(currentTab)}的照片
              </h3>
              <p className="text-black font-bold">
                {currentTab === "pending"
                  ? "等待用户上传照片..."
                  : "切换到其他标签页查看更多照片"}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-white border-4 border-black"
            >
              {/* 照片对比 */}
              <div className="space-y-3 p-4">
                {/* 原图 */}
                <div>
                  <h4 className="text-sm font-bold text-black mb-2 bg-[#6DCACE] p-2 border-4 border-black text-center">
                    原图
                  </h4>
                  <div className="aspect-square relative bg-white border-4 border-black">
                    <Image
                      src={photo.original_url}
                      alt="原图"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* 卡通图 */}
                {photo.cartoon_url && (
                  <div>
                    <h4 className="text-sm font-bold text-black mb-2 bg-[#FFC837] p-2 border-4 border-black text-center">
                      卡通图
                    </h4>
                    <div className="aspect-square relative bg-white border-4 border-black">
                      <Image
                        src={photo.cartoon_url}
                        alt="卡通图"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* 处理错误 */}
                {photo.processing_error && (
                  <div className="bg-[#FD543F] border-4 border-black p-3">
                    <p className="text-black text-sm font-bold">
                      <strong>处理失败：</strong>
                      {photo.processing_error}
                    </p>
                  </div>
                )}
              </div>

              {/* 照片信息 */}
              <div className="px-4 py-3 bg-[#6DCACE] border-t-4 border-black">
                <div className="text-xs text-black font-bold space-y-1">
                  <div>ID: {photo.id.substring(0, 8)}...</div>
                  <div>
                    上传: {new Date(photo.created_at).toLocaleString("zh-CN")}
                  </div>
                  {photo.approved_at && (
                    <div>
                      审核:{" "}
                      {new Date(photo.approved_at).toLocaleString("zh-CN")}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                {currentTab === "completed" && !photo.processing_error && (
                  <div className="flex space-x-2 mt-3">
                    <button
                      onClick={() => handleApprove(photo.id)}
                      disabled={
                        processingIds.has(photo.id) || !photo.cartoon_url
                      }
                      className="flex-1 bg-[#6CC8CC] text-black py-2 px-3 border-4 border-black font-bold hover:bg-black hover:text-[#6CC8CC] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {processingIds.has(photo.id) ? "处理中..." : "通过"}
                      </span>
                    </button>
                    <button
                      onClick={() => handleReject(photo.id)}
                      disabled={processingIds.has(photo.id)}
                      className="flex-1 bg-[#FC6A59] text-black py-2 px-3 border-4 border-black font-bold hover:bg-black hover:text-[#FC6A59] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>
                        {processingIds.has(photo.id) ? "处理中..." : "拒绝"}
                      </span>
                    </button>
                  </div>
                )}

                {(currentTab === "failed" || photo.processing_error) && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleReject(photo.id)}
                      disabled={processingIds.has(photo.id)}
                      className="w-full bg-[#FD543F] text-black py-2 px-3 border-4 border-black font-bold hover:bg-black hover:text-[#FD543F] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>
                        {processingIds.has(photo.id)
                          ? "处理中..."
                          : "删除失败项"}
                      </span>
                    </button>
                  </div>
                )}

                {/* 已通过状态的删除按钮 */}
                {currentTab === "approved" && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleReject(photo.id)}
                      disabled={processingIds.has(photo.id)}
                      className="w-full bg-[#FD543F] text-black py-2 px-3 border-4 border-black font-bold hover:bg-black hover:text-[#FD543F] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>
                        {processingIds.has(photo.id)
                          ? "处理中..."
                          : "删除"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
