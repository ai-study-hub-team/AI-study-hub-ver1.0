import {
  Bell,
  BellRing,
  Bot,
  Check,
  CheckCheck,
  CreditCard,
  FileCheck2,
  FileWarning,
  FolderOpen,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useNavigate } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import {
  notificationApi,
  type NotificationResponse,
} from "../../services/notificationApi";

const POLL_INTERVAL_MS = 30_000;

const DESKTOP_BASELINE_KEY =
  "notificationDesktopBaselineId";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const apiError = error as ApiError;

  return (
    apiError.response?.data?.message ||
    apiError.response?.data?.error ||
    apiError.message ||
    fallback
  );
};

const getNotificationIcon = (
  type: string,
) => {
  switch (type) {
    case "AI_PROCESSING_COMPLETED":
      return Bot;

    case "DOCUMENT_REPORTED":
      return FileWarning;

    case "REPORT_RESOLVED":
      return FileCheck2;

    case "PAYMENT_SUCCESS":
    case "PAYMENT_FAILED":
    case "SUBSCRIPTION_EXPIRING_7_DAYS":
    case "SUBSCRIPTION_EXPIRED":
      return CreditCard;

    case "DOCUMENT_SHARED":
      return Share2;

    case "FOLDER_SHARED":
      return FolderOpen;

    default:
      return BellRing;
  }
};

/**
 * Chuyển route backend về route frontend hiện tại.
 */
const normalizeActionUrl = (
  url?: string | null,
): string | null => {
  if (!url) {
    return null;
  }

  const trimmedUrl = url.trim();

  // Chỉ cho phép điều hướng nội bộ.
  if (!trimmedUrl.startsWith("/")) {
    return null;
  }

  if (
    trimmedUrl.startsWith(
      "/admin/document-reports",
    )
  ) {
    return "/admin/reports";
  }

  if (
    trimmedUrl.startsWith(
      "/document-reports",
    )
  ) {
    return "/app/dashboard";
  }

  if (
    trimmedUrl.startsWith("/documents/")
  ) {
    const urlParts = trimmedUrl
      .split("/")
      .filter(Boolean);

    const documentId =
      urlParts.length > 0
        ? urlParts[urlParts.length - 1]
        : undefined;

    if (documentId) {
      return `/app/library/${documentId}/preview`;
    }

    return null;
  }

  return trimmedUrl;
};

const formatCreatedAt = (
  createdAt: string,
): string => {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
  });
};

export function NotificationBell() {
  const navigate = useNavigate();

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const initialPollCompletedRef =
    useRef(false);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationResponse[]>([]);

  const [
    desktopPermission,
    setDesktopPermission,
  ] = useState<
    NotificationPermission | "unsupported"
  >(
    typeof window !== "undefined" &&
      "Notification" in window
      ? window.Notification.permission
      : "unsupported",
  );

  const loadNotifications = useCallback(
    async (showDesktop = false) => {
      try {
        const [
          listResponse,
          countResponse,
        ] = await Promise.all([
          notificationApi.getNotifications(
            0,
            8,
          ),
          notificationApi.getUnreadCount(),
        ]);

        const nextNotifications =
          listResponse.data.content || [];

        setNotifications(
          nextNotifications,
        );

        setUnreadCount(
          Number(
            countResponse.data.count || 0,
          ),
        );

        const maxId =
          nextNotifications.reduce(
            (currentMax, item) =>
              Math.max(
                currentMax,
                item.id,
              ),
            0,
          );

        const storedBaseline = Number(
          localStorage.getItem(
            DESKTOP_BASELINE_KEY,
          ) || "0",
        );

        /*
         * Lần tải đầu tiên chỉ lưu mốc ID.
         * Không hiển thị desktop notification
         * cho các thông báo cũ.
         */
        if (
          !initialPollCompletedRef.current
        ) {
          localStorage.setItem(
            DESKTOP_BASELINE_KEY,
            String(maxId),
          );

          initialPollCompletedRef.current =
            true;

          return;
        }

        if (
          showDesktop &&
          desktopPermission === "granted"
        ) {
          const newUnreadNotifications =
            nextNotifications
              .filter(
                (item) =>
                  !item.read &&
                  item.id > storedBaseline,
              )
              .sort(
                (left, right) =>
                  left.id - right.id,
              );

          newUnreadNotifications.forEach(
            (item) => {
              const browserNotification =
                new window.Notification(
                  item.title,
                  {
                    body: item.message,
                    icon: "/favicon.ico",
                    tag: `ai-study-hub-notification-${item.id}`,
                  },
                );

              browserNotification.onclick =
                () => {
                  window.focus();

                  const actionUrl =
                    normalizeActionUrl(
                      item.actionUrl,
                    );

                  if (actionUrl) {
                    navigate(actionUrl);
                  }

                  browserNotification.close();
                };
            },
          );
        }

        if (maxId > storedBaseline) {
          localStorage.setItem(
            DESKTOP_BASELINE_KEY,
            String(maxId),
          );
        }
      } catch (error) {
        console.error(
          "Load notifications failed:",
          error,
        );
      }
    },
    [desktopPermission, navigate],
  );

  /*
   * Tải thông báo lần đầu và kiểm tra
   * thông báo mới mỗi 30 giây.
   */
  useEffect(() => {
    void loadNotifications(false);

    const intervalId =
      window.setInterval(() => {
        void loadNotifications(true);
      }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  /*
   * Đóng dropdown khi click bên ngoài.
   */
  useEffect(() => {
    const handleDocumentClick = (
      event: MouseEvent,
    ) => {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleDocumentClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleDocumentClick,
      );
    };
  }, [open]);

  const handleToggle = async () => {
    const nextOpen = !open;

    setOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    setLoading(true);

    try {
      await loadNotifications(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick =
    async (
      item: NotificationResponse,
    ) => {
      try {
        if (!item.read) {
          const response =
            await notificationApi.markRead(
              item.id,
            );

          setNotifications(
            (currentItems) =>
              currentItems.map(
                (currentItem) =>
                  currentItem.id === item.id
                    ? response.data
                    : currentItem,
              ),
          );

          setUnreadCount(
            (currentCount) =>
              Math.max(
                0,
                currentCount - 1,
              ),
          );
        }
      } catch (error) {
        console.error(
          "Mark notification as read failed:",
          error,
        );
      }

      setOpen(false);

      const actionUrl =
        normalizeActionUrl(
          item.actionUrl,
        );

      if (actionUrl) {
        navigate(actionUrl);
      }
    };

  const handleMarkAllRead =
    async () => {
      try {
        await notificationApi.markAllRead();

        setNotifications(
          (currentItems) =>
            currentItems.map((item) => ({
              ...item,
              read: true,
              readAt:
                item.readAt ||
                new Date().toISOString(),
            })),
        );

        setUnreadCount(0);

        toast.success(
          "All notifications marked as read",
        );
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            "Cannot mark all notifications as read",
          ),
        );
      }
    };

  const handleDelete = async (
    event: ReactMouseEvent<HTMLButtonElement>,
    notificationId: number,
    wasUnread: boolean,
  ) => {
    event.stopPropagation();

    try {
      await notificationApi.deleteNotification(
        notificationId,
      );

      setNotifications(
        (currentItems) =>
          currentItems.filter(
            (item) =>
              item.id !== notificationId,
          ),
      );

      if (wasUnread) {
        setUnreadCount(
          (currentCount) =>
            Math.max(
              0,
              currentCount - 1,
            ),
        );
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Cannot delete notification",
        ),
      );
    }
  };

  const handleEnableDesktopNotifications =
    async () => {
      if (!("Notification" in window)) {
        setDesktopPermission(
          "unsupported",
        );

        toast.error(
          "This browser does not support desktop notifications",
        );

        return;
      }

      try {
        const permission =
          await window.Notification.requestPermission();

        setDesktopPermission(
          permission,
        );

        if (permission === "granted") {
          toast.success(
            "Desktop notifications enabled",
          );
        } else {
          toast.info(
            "Desktop notification permission was not granted",
          );
        }
      } catch (error) {
        console.error(
          "Request notification permission failed:",
          error,
        );

        toast.error(
          "Cannot enable desktop notifications",
        );
      }
    };

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 text-[10px] leading-none text-white font-bold flex items-center justify-center">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[10000] w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">
                Notifications
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount} unread
              </p>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={
                    handleMarkAllRead
                  }
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {desktopPermission ===
            "default" && (
            <button
              type="button"
              onClick={
                handleEnableDesktopNotifications
              }
              className="w-full flex items-center gap-3 px-4 py-3 text-left bg-blue-50/70 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/15 border-b border-blue-100 dark:border-blue-500/20"
            >
              <BellRing className="w-5 h-5 text-blue-600 shrink-0" />

              <span>
                <span className="block text-sm font-bold text-blue-700 dark:text-blue-300">
                  Enable desktop
                  notifications
                </span>

                <span className="block text-xs text-blue-600/80 dark:text-blue-300/70">
                  Receive alerts while
                  this page is open.
                </span>
              </span>
            </button>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length ===
              0 ? (
              <div className="px-6 py-12 text-center">
                <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />

                <p className="mt-3 font-bold text-slate-700 dark:text-slate-200">
                  No notifications yet
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  New system activities
                  will appear here.
                </p>
              </div>
            ) : (
              notifications.map(
                (item) => {
                  const Icon =
                    getNotificationIcon(
                      item.type,
                    );

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        void handleNotificationClick(
                          item,
                        )
                      }
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                            "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();

                          void handleNotificationClick(
                            item,
                          );
                        }
                      }}
                      className={`group w-full flex items-start gap-3 px-4 py-4 text-left border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors cursor-pointer ${
                        item.read
                          ? "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                          : "bg-blue-50/60 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                            {item.title}
                          </p>

                          {!item.read && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>

                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                          {item.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {formatCreatedAt(
                            item.createdAt,
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {!item.read && (
                          <span
                            className="p-1.5 text-emerald-600"
                            title="Click notification to mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(
                            event,
                          ) =>
                            void handleDelete(
                              event,
                              item.id,
                              !item.read,
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                },
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);

              navigate(
                "/app/notifications",
              );
            }}
            className="w-full px-4 py-3 text-sm font-bold text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}