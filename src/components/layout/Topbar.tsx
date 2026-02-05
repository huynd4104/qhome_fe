"use client";
import React from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import Link from "next/link";
import { getNotificationsForRoleIncludingAll, getNotificationDetail } from "@/src/services/customer-interaction/notiService";
import { Notification } from "@/src/types/notification";
import { getNewsList, getNewsDetail } from "@/src/services/customer-interaction/newService";
import { News } from "@/src/types/news";

export default function Topbar() {
  const [q, setQ] = React.useState("");
  const [showMenu, setShowMenu] = React.useState(false);
  const [showNotiMenu, setShowNotiMenu] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"noti" | "news">("noti");
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [newsList, setNewsList] = React.useState<News[]>([]);
  const [loadingNoti, setLoadingNoti] = React.useState(false);
  const [loadingNews, setLoadingNews] = React.useState(false);
  const [viewedNewsIds, setViewedNewsIds] = React.useState<Set<string>>(new Set());
  const [viewedNotificationIds, setViewedNotificationIds] = React.useState<Set<string>>(new Set());
  const [showPopup, setShowPopup] = React.useState(false);
  const [popupType, setPopupType] = React.useState<"notification" | "news" | null>(null);
  const [selectedNotification, setSelectedNotification] = React.useState<Notification | null>(null);
  const [selectedNews, setSelectedNews] = React.useState<News | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      logout();
    }
  };

  // Handle click on notification item
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.id) return;

    setLoadingDetail(true);
    setShowPopup(true);
    setPopupType("notification");
    setShowNotiMenu(false);

    // Mark notification as viewed
    const newViewedIds = new Set(viewedNotificationIds);
    newViewedIds.add(notification.id);
    setViewedNotificationIds(newViewedIds);
    // Save to localStorage
    localStorage.setItem('viewedNotificationIds', JSON.stringify(Array.from(newViewedIds)));

    try {
      const detail = await getNotificationDetail(notification.id);
      setSelectedNotification(detail);
    } catch (err) {
      console.error("Error fetching notification detail:", err);
      // Fallback to use the notification from list if detail fetch fails
      setSelectedNotification(notification);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle click on news item
  const handleNewsClick = async (news: News) => {
    if (!news.id) return;

    setLoadingDetail(true);
    setShowPopup(true);
    setPopupType("news");
    setShowNotiMenu(false);

    // Mark news as viewed
    const newViewedIds = new Set(viewedNewsIds);
    newViewedIds.add(news.id);
    setViewedNewsIds(newViewedIds);
    // Save to localStorage
    localStorage.setItem('viewedNewsIds', JSON.stringify(Array.from(newViewedIds)));

    try {
      const detail = await getNewsDetail(news.id);
      setSelectedNews(detail);
    } catch (err) {
      console.error("Error fetching news detail:", err);
      // Fallback to use the news from list if detail fetch fails
      setSelectedNews(news);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Fetch notifications based on user role (including "ALL")
  const fetchNotifications = React.useCallback(() => {
    if (!user?.roles?.[0] || !user?.userId) return;

    setLoadingNoti(true);
    getNotificationsForRoleIncludingAll(user.roles[0], user.userId)
      .then(notis => {
        // Backend already filters by deletedAt IS NULL (active), so we just use the result
        setNotifications(notis);
      })
      .catch(err => {
        console.error("Error fetching notifications:", err);
        setNotifications([]);
      })
      .finally(() => setLoadingNoti(false));
  }, [user?.roles, user?.userId]);

  // Load viewed news and notification IDs from localStorage on mount
  React.useEffect(() => {
    const storedNews = localStorage.getItem('viewedNewsIds');
    if (storedNews) {
      try {
        const ids = JSON.parse(storedNews);
        setViewedNewsIds(new Set(ids));
      } catch (e) {
        console.error('Failed to parse viewedNewsIds from localStorage', e);
      }
    }

    const storedNotis = localStorage.getItem('viewedNotificationIds');
    if (storedNotis) {
      try {
        const ids = JSON.parse(storedNotis);
        setViewedNotificationIds(new Set(ids));
      } catch (e) {
        console.error('Failed to parse viewedNotificationIds from localStorage', e);
      }
    }
  }, []);

  // Fetch news based on user role (including "ALL") and filter published/active
  const fetchNews = React.useCallback(() => {
    if (!user?.roles?.[0]) return;

    setLoadingNews(true);
    getNewsList()
      .then(allNews => {
        // Filter: only PUBLISHED or SCHEDULED status, and check publishAt/expireAt
        const now = new Date();
        const filtered = allNews.filter(news => {
          // Check status: only PUBLISHED or SCHEDULED
          if (news.status !== 'PUBLISHED' && news.status !== 'SCHEDULED') {
            return false;
          }

          // Check publishAt: must be in the past or null
          if (news.publishAt) {
            const publishDate = new Date(news.publishAt);
            if (publishDate > now) {
              return false;
            }
          }

          // Check expireAt: must be in the future or null
          if (news.expireAt) {
            const expireDate = new Date(news.expireAt);
            if (expireDate < now) {
              return false;
            }
          }

          // Filter by role: include if targetRole matches user role OR targetRole is "ALL" or null
          if (news.scope === "INTERNAL") {
            if (news.targetRole) {
              const targetRoleUpper = news.targetRole.toUpperCase();
              const userRoleUpper = user.roles[0].toUpperCase();
              // Include if matches user role or is "ALL"
              if (targetRoleUpper !== userRoleUpper && targetRoleUpper !== "ALL") {
                return false;
              }
            }
            // If targetRole is null, include it (for all roles)
          }

          return true;
        });

        // Sort by createdAt DESC (newest first)
        filtered.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setNewsList(filtered);
      })
      .catch(err => {
        console.error("Error fetching news:", err);
        setNewsList([]);
      })
      .finally(() => setLoadingNews(false));
  }, [user?.roles]);

  // Load notifications and news on mount and when user changes
  React.useEffect(() => {
    fetchNotifications();
    fetchNews();
  }, [fetchNotifications, fetchNews]);

  // Fetch data when tab changes (only if menu is open)
  React.useEffect(() => {
    if (!showNotiMenu) return;

    if (activeTab === "noti") {
      fetchNotifications();
    } else if (activeTab === "news") {
      fetchNews();
    }
  }, [showNotiMenu, activeTab, fetchNotifications, fetchNews]);

  // Real-time polling: refresh data every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
      fetchNews();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchNotifications, fetchNews]);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center">
      <div className="max-w-[1280px] mx-auto px-4 w-full flex items-center gap-3">
        <div className="flex-1">
          <label className="relative block">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Search-2-Fill--Streamline-Mingcute-Fill" height="16" width="16">
                <g fill="none" fillRule="evenodd">
                  <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                  <path fill="#9ca3af" d="M3.6666666666666665 6.666666666666666a3 3 0 1 1 6 0 3 3 0 0 1 -6 0ZM6.666666666666666 1.6666666666666665a5 5 0 1 0 2.7573333333333334 9.171333333333333l3.202 3.2026666666666666a1 1 0 0 0 1.4146666666666665 -1.4146666666666665l-3.2026666666666666 -3.202A5 5 0 0 0 6.666666666666666 1.6666666666666665Z" strokeWidth="0.6667"></path>
                </g>
              </svg>
            </span>
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Tìm kiếm nhanh (Ctrl + K)"
              className="w-full md:max-w-xl pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </label>
        </div>
        <div className="relative flex items-center gap-2">
          {/* Notification Bell Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotiMenu(!showNotiMenu);
                setShowMenu(false);
              }}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {(() => {
                // Check if there are unread news
                const hasUnreadNews = newsList.some(news => news.id && !viewedNewsIds.has(news.id));
                // Check if there are unread notifications
                const hasUnreadNotifications = notifications.some(noti => noti.id && !viewedNotificationIds.has(noti.id));
                // Show red dot only if there are unread items
                return (hasUnreadNews || hasUnreadNotifications) && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                );
              })()}
            </button>

            {/* Notification Dropdown */}
            {showNotiMenu && (
              <div className="absolute right-0 top-10 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab("noti")}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition ${activeTab === "noti"
                        ? "text-green-600 border-b-2 border-green-600"
                        : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Thông báo ({notifications.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("news")}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition ${activeTab === "news"
                        ? "text-green-600 border-b-2 border-green-600"
                        : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Tin tức ({newsList.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="max-h-96 overflow-y-auto">
                  {activeTab === "noti" ? (
                    <div className="p-2">
                      {loadingNoti ? (
                        <div className="text-center py-8 text-slate-500 text-sm">Đang tải...</div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">Không có thông báo</div>
                      ) : (
                        <div className="space-y-2">
                          {notifications.slice(0, 10).map((noti) => {
                            const isUnread = noti.id && !viewedNotificationIds.has(noti.id);
                            return (
                              <button
                                key={noti.id}
                                onClick={() => handleNotificationClick(noti)}
                                className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition border border-slate-100 cursor-pointer relative"
                              >
                                {isUnread && (
                                  <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
                                )}
                                <div className="flex items-start gap-2">
                                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${noti.type === "ALERT" ? "bg-red-500" :
                                      noti.type === "WARNING" ? "bg-yellow-500" :
                                        noti.type === "SUCCESS" ? "bg-green-500" :
                                          "bg-blue-500"
                                    }`}></div>
                                  <div className="flex-1">
                                    <div className={`text-sm font-medium ${isUnread ? 'text-slate-900 font-semibold' : 'text-slate-900'}`}>
                                      {noti.title}
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1 line-clamp-2">{noti.message}</div>
                                    {noti.createdAt && (
                                      <div className="text-xs text-slate-400 mt-1">
                                        {new Date(noti.createdAt).toLocaleDateString("vi-VN")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2">
                      {loadingNews ? (
                        <div className="text-center py-8 text-slate-500 text-sm">Đang tải...</div>
                      ) : newsList.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">Không có tin tức</div>
                      ) : (
                        <div className="space-y-2">
                          {newsList.slice(0, 10).map((news) => {
                            const isUnread = news.id && !viewedNewsIds.has(news.id);
                            return (
                              <button
                                key={news.id}
                                onClick={() => handleNewsClick(news)}
                                className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition border border-slate-100 cursor-pointer relative"
                              >
                                {isUnread && (
                                  <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
                                )}
                                <div className="flex items-start gap-2">
                                  {news.coverImageUrl && (
                                    <img
                                      src={news.coverImageUrl}
                                      alt={news.title}
                                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium line-clamp-1 ${isUnread ? 'text-slate-900 font-semibold' : 'text-slate-900'}`}>
                                      {news.title}
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1 line-clamp-2">{news.summary}</div>
                                    {news.createdAt && (
                                      <div className="text-xs text-slate-400 mt-1">
                                        {new Date(news.createdAt).toLocaleDateString("vi-VN")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-slate-700">{user?.username || 'User'}</div>
            <div className="text-xs text-slate-500">{user?.roles?.[0] || 'Guest'}</div>
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="inline-flex h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 items-center justify-center text-white font-semibold hover:shadow-lg transition"
          >
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-10 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <Link href="/profileView">
                  <div className="text-sm font-medium text-slate-700">{user?.username}</div>
                  <div className="text-xs text-slate-500">{user?.email}</div>
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay to close menus */}
      {(showMenu || showNotiMenu) && (
        <div
          className="fixed inset-0 z-40 md:ml-60"
          onClick={() => {
            setShowMenu(false);
            setShowNotiMenu(false);
          }}
        />
      )}

      {/* Detail Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {popupType === "notification" ? "Chi tiết thông báo" : "Chi tiết tin tức"}
              </h3>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setSelectedNotification(null);
                  setSelectedNews(null);
                  setPopupType(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingDetail ? (
                <div className="text-center py-8 text-slate-500">Đang tải...</div>
              ) : popupType === "notification" && selectedNotification ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${selectedNotification.type === "ALERT" ? "bg-red-500" :
                        selectedNotification.type === "WARNING" ? "bg-yellow-500" :
                          selectedNotification.type === "SUCCESS" ? "bg-green-500" :
                            "bg-blue-500"
                      }`}></div>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-slate-900 mb-2">{selectedNotification.title}</h4>
                      <div className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{selectedNotification.message}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Loại</div>
                      <div className="text-sm font-medium text-slate-900">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${selectedNotification.type === "ALERT" ? "bg-red-100 text-red-800" :
                            selectedNotification.type === "WARNING" ? "bg-yellow-100 text-yellow-800" :
                              selectedNotification.type === "SUCCESS" ? "bg-green-100 text-green-800" :
                                "bg-blue-100 text-blue-800"
                          }`}>
                          {selectedNotification.type}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Phạm vi</div>
                      <div className="text-sm text-slate-900">
                        {selectedNotification.scope === "INTERNAL" ? "Nội bộ" : "Ngoại bộ"}
                      </div>
                    </div>
                    {selectedNotification.targetRole && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Đối tượng</div>
                        <div className="text-sm text-slate-900">{selectedNotification.targetRole}</div>
                      </div>
                    )}
                    {selectedNotification.createdAt && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Ngày tạo</div>
                        <div className="text-sm text-slate-900">
                          {new Date(selectedNotification.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedNotification.actionUrl && (
                    <div className="pt-4 border-t border-slate-200">
                      <a
                        href={selectedNotification.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        Xem thêm
                      </a>
                    </div>
                  )}
                </div>
              ) : popupType === "news" && selectedNews ? (
                <div className="space-y-4">
                  {selectedNews.coverImageUrl && (
                    <img
                      src={selectedNews.coverImageUrl}
                      alt={selectedNews.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}

                  <div>
                    <h4 className="text-base font-semibold text-slate-900 mb-2">{selectedNews.title}</h4>
                    {selectedNews.summary && (
                      <div className="text-sm text-slate-600 mb-3">{selectedNews.summary}</div>
                    )}
                    <div
                      className="text-sm text-slate-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedNews.bodyHtml }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Trạng thái</div>
                      <div className="text-sm font-medium text-slate-900">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${selectedNews.status === "PUBLISHED" ? "bg-green-100 text-green-800" :
                            selectedNews.status === "SCHEDULED" ? "bg-blue-100 text-blue-800" :
                              "bg-slate-100 text-slate-800"
                          }`}>
                          {selectedNews.status === "PUBLISHED" ? "Đã xuất bản" :
                            selectedNews.status === "SCHEDULED" ? "Đã lên lịch" :
                              selectedNews.status}
                        </span>
                      </div>
                    </div>
                    {selectedNews.scope && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Phạm vi</div>
                        <div className="text-sm text-slate-900">
                          {selectedNews.scope === "INTERNAL" ? "Nội bộ" : "Ngoại bộ"}
                        </div>
                      </div>
                    )}
                    {selectedNews.targetRole && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Đối tượng</div>
                        <div className="text-sm text-slate-900">{selectedNews.targetRole}</div>
                      </div>
                    )}
                    {selectedNews.publishAt && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Ngày xuất bản</div>
                        <div className="text-sm text-slate-900">
                          {new Date(selectedNews.publishAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    )}
                    {selectedNews.createdAt && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Ngày tạo</div>
                        <div className="text-sm text-slate-900">
                          {new Date(selectedNews.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    )}
                    {selectedNews.viewCount !== undefined && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Lượt xem</div>
                        <div className="text-sm text-slate-900">{selectedNews.viewCount}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
