import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { useNavigate } from "react-router";
import { format } from "date-fns";
import { motion } from "motion/react";
import { toast } from "sonner";

import {
  notificationApi,
  type NotificationResponse,
} from "../../services/notificationApi";

import {
  getNotificationIcon,
  getNotificationLabel,
  normalizeActionUrl,
} from "../../utils/notificationUtils";

/* =========================================================
   TYPES
========================================================= */

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };

  message?: string;
};

/* =========================================================
   ERROR MESSAGE
========================================================= */

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

/* =========================================================
   FORMAT DATE
========================================================= */

const formatDateTime = (
  value: string,
): string => {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return format(
    date,
    "dd/MM/yyyy HH:mm",
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export function NotificationsPage() {
  const navigate =
    useNavigate();

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationResponse[]>([]);

  const [page, setPage] =
    useState(0);

  const [
    totalPages,
    setTotalPages,
  ] = useState(0);

  const [
    totalElements,
    setTotalElements,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busyId,
    setBusyId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  /* =========================================================
     LOAD NOTIFICATIONS
  ========================================================= */

  const loadNotifications =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const response =
            await notificationApi.getNotifications(
              page,
              20,
            );

          setNotifications(
            response.data.content ||
              [],
          );

          setTotalPages(
            response.data
              .totalPages || 0,
          );

          setTotalElements(
            response.data
              .totalElements || 0,
          );
        } catch (error) {
          console.error(
            "Load notifications failed:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
              "Cannot load notifications",
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [page],
    );

  /* =========================================================
     LOAD WHEN PAGE CHANGES
  ========================================================= */

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /* =========================================================
     OPEN NOTIFICATION
  ========================================================= */

  const handleOpenNotification =
    async (
      item: NotificationResponse,
    ) => {
      setBusyId(item.id);

      try {
        if (!item.read) {
          const response =
            await notificationApi.markRead(
              item.id,
            );

          setNotifications(
            (currentItems) =>
              currentItems.map(
                (
                  currentItem,
                ) =>
                  currentItem.id ===
                  item.id
                    ? response.data
                    : currentItem,
              ),
          );
        }

        const actionUrl =
          normalizeActionUrl(
            item.actionUrl,
          );

        if (actionUrl) {
          navigate(actionUrl);
        }
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            "Cannot open notification",
          ),
        );
      } finally {
        setBusyId(null);
      }
    };

  /* =========================================================
     DELETE NOTIFICATION
  ========================================================= */

  const handleDelete =
    async (
      event: ReactMouseEvent<HTMLButtonElement>,
      notificationId: number,
    ) => {
      event.stopPropagation();

      setBusyId(
        notificationId,
      );

      try {
        await notificationApi.deleteNotification(
          notificationId,
        );

        toast.success(
          "Notification deleted",
        );

        if (
          notifications.length ===
            1 &&
          page > 0
        ) {
          setPage(
            (currentPage) =>
              currentPage - 1,
          );
        } else {
          await loadNotifications();
        }
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            "Cannot delete notification",
          ),
        );
      } finally {
        setBusyId(null);
      }
    };

  /* =========================================================
     MARK ALL READ
  ========================================================= */

  const handleMarkAllRead =
    async () => {
      setMarkingAll(true);

      try {
        await notificationApi.markAllRead();

        setNotifications(
          (currentItems) =>
            currentItems.map(
              (item) => ({
                ...item,

                read: true,

                readAt:
                  item.readAt ||
                  new Date().toISOString(),
              }),
            ),
        );

        toast.success(
          "All notifications marked as read",
        );
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            "Cannot mark all as read",
          ),
        );
      } finally {
        setMarkingAll(false);
      }
    };

  /* =========================================================
     UNREAD COUNT CURRENT PAGE
  ========================================================= */

  const unreadCount =
    notifications.filter(
      (item) => !item.read,
    ).length;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Notifications
          </h1>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {totalElements}{" "}
            notifications ·{" "}
            {unreadCount} unread
            on this page
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* REFRESH */}

          <button
            type="button"
            onClick={() =>
              void loadNotifications()
            }
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

          {/* MARK ALL READ */}

          <button
            type="button"
            onClick={
              handleMarkAllRead
            }
            disabled={
              markingAll ||
              totalElements === 0
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCheck className="w-4 h-4" />

            {markingAll
              ? "Marking..."
              : "Mark all read"}
          </button>
        </div>
      </div>

      {/* =====================================================
          NOTIFICATION CONTAINER
      ===================================================== */}

      <motion.div
        initial={{
          opacity: 0,
          y: 16,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
      >
        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (
          <div className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
            Loading notifications...
          </div>
        ) : notifications.length ===
          0 ? (
          /* =================================================
             EMPTY STATE
          ================================================= */

          <div className="px-6 py-20 text-center">
            <Bell className="w-14 h-14 mx-auto text-slate-300 dark:text-slate-600" />

            <h2 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">
              No notifications
            </h2>

            <p className="mt-2 text-slate-500 dark:text-slate-400">
              You are all caught up.
            </p>
          </div>
        ) : (
          /* =================================================
             NOTIFICATION ITEMS
          ================================================= */

          notifications.map(
            (item) => {
              const Icon =
                getNotificationIcon(
                  item.type,
                );

              const label =
                getNotificationLabel(
                  item.type,
                );

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    void handleOpenNotification(
                      item,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                        "Enter" ||
                      event.key ===
                        " "
                    ) {
                      event.preventDefault();

                      void handleOpenNotification(
                        item,
                      );
                    }
                  }}
                  aria-disabled={
                    busyId ===
                    item.id
                  }
                  className={`group w-full flex items-start gap-4 px-5 py-5 text-left border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors cursor-pointer ${
                    busyId === item.id
                      ? "opacity-60 pointer-events-none"
                      : ""
                  } ${
                    item.read
                      ? "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      : "bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  }`}
                >
                  {/* =========================================
                      ICON
                  ========================================= */}

                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  {/* =========================================
                      CONTENT
                  ========================================= */}

                  <div className="min-w-0 flex-1">
                    {/* TITLE */}

                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>

                      {!item.read && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>

                    {/* MESSAGE */}

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {item.message}
                    </p>

                    {/* META */}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {/* TYPE LABEL */}

                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {label}
                      </span>

                      {/* CREATED AT */}

                      <span className="text-xs text-slate-400">
                        {formatDateTime(
                          item.createdAt,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* =========================================
                      DELETE
                  ========================================= */}

                  <button
                    type="button"
                    onClick={(
                      event,
                    ) =>
                      void handleDelete(
                        event,
                        item.id,
                      )
                    }
                    disabled={
                      busyId ===
                      item.id
                    }
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    aria-label="Delete notification"
                    title="Delete notification"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            },
          )
        )}
      </motion.div>

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {/* PREVIOUS */}

          <button
            type="button"
            onClick={() =>
              setPage(
                (
                  currentPage,
                ) =>
                  Math.max(
                    0,
                    currentPage -
                      1,
                  ),
              )
            }
            disabled={
              page <= 0 ||
              loading
            }
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* PAGE INFO */}

          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
            Page {page + 1} of{" "}
            {totalPages}
          </span>

          {/* NEXT */}

          <button
            type="button"
            onClick={() =>
              setPage(
                (
                  currentPage,
                ) =>
                  Math.min(
                    totalPages -
                      1,
                    currentPage +
                      1,
                  ),
              )
            }
            disabled={
              page >=
                totalPages - 1 ||
              loading
            }
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}