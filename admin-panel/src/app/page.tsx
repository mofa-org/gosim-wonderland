"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Check, X, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import { Photo, PhotoStatus } from "@/lib/types";

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

export default function AdminPanel() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [currentTab, setCurrentTab] = useState<PhotoStatus>("pending");
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPhotos();
    // 定期刷新
    const interval = setInterval(loadPhotos, 5000);
    return () => clearInterval(interval);
  }, [currentTab]);

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

    setProcessingIds((prev) => new Set(prev).add(photoId));

    try {
      const response = await fetch(`/api/admin/approve/${photoId}`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        // 从当前列表中移除
        setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
        setStats((prev) => ({
          ...prev,
          pending: prev.pending - 1,
          approved: prev.approved + 1,
        }));
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

    setProcessingIds((prev) => new Set(prev).add(photoId));

    try {
      const response = await fetch(`/api/admin/approve/${photoId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        // 从当前列表中移除
        setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
        setStats((prev) => ({
          ...prev,
          pending: prev.pending - 1,
          rejected: prev.rejected + 1,
        }));
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
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getTabName = (tab: PhotoStatus) => {
    switch (tab) {
      case "pending":
        return "待审核";
      case "approved":
        return "已通过";
      case "rejected":
        return "已拒绝";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                GOSIM Wonderland 管理后台
              </h1>
              <p className="text-gray-600 mt-1">照片审核与管理</p>
            </div>

            <button
              onClick={loadPhotos}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>刷新</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {(["pending", "approved", "rejected"] as PhotoStatus[]).map(
              (status) => (
                <div key={status} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    {getTabIcon(status)}
                    <span className="text-sm">{getTabName(status)}</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{stats[status]}</div>
                </div>
              ),
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {(["pending", "approved", "rejected"] as PhotoStatus[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    currentTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {getTabIcon(tab)}
                  <span>{getTabName(tab)}</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
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
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        )}

        {!loading && photos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              暂无{getTabName(currentTab)}的照片
            </h3>
            <p className="text-gray-500">
              {currentTab === "pending"
                ? "等待用户上传照片..."
                : "切换到其他标签页查看更多照片"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              {/* 照片对比 */}
              <div className="space-y-3 p-4">
                {/* 原图 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    原图
                  </h4>
                  <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
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
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      卡通图
                    </h4>
                    <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
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
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">
                      <strong>处理失败：</strong>
                      {photo.processing_error}
                    </p>
                  </div>
                )}
              </div>

              {/* 照片信息 */}
              <div className="px-4 py-3 bg-gray-50">
                <div className="text-xs text-gray-500 space-y-1">
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
                {currentTab === "pending" && !photo.processing_error && (
                  <div className="flex space-x-2 mt-3">
                    <button
                      onClick={() => handleApprove(photo.id)}
                      disabled={
                        processingIds.has(photo.id) || !photo.cartoon_url
                      }
                      className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {processingIds.has(photo.id) ? "处理中..." : "通过"}
                      </span>
                    </button>
                    <button
                      onClick={() => handleReject(photo.id)}
                      disabled={processingIds.has(photo.id)}
                      className="flex-1 bg-red-600 text-white py-2 px-3 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm"
                    >
                      <X className="w-4 h-4" />
                      <span>
                        {processingIds.has(photo.id) ? "处理中..." : "拒绝"}
                      </span>
                    </button>
                  </div>
                )}

                {currentTab === "pending" && photo.processing_error && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleReject(photo.id)}
                      disabled={processingIds.has(photo.id)}
                      className="w-full bg-red-600 text-white py-2 px-3 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm"
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
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
