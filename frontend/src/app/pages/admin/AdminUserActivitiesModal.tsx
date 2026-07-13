import {
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  adminUserActivityApi,
  type UserActivityLogResponse,
} from "../../services/adminUserActivityApi";

interface AdminUserActivitiesModalProps {
  userId: number;
  userName: string;
  onClose: () => void;
}

const PAGE_SIZE = 10;

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? value
    : date.toLocaleString();
};

export function AdminUserActivitiesModal({
  userId,
  userName,
  onClose,
}: AdminUserActivitiesModalProps) {
  const [
    activities,
    setActivities,
  ] = useState<
    UserActivityLogResponse[]
  >([]);

  const [
    page,
    setPage,
  ] = useState(0);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    totalElements,
    setTotalElements,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadActivities =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await adminUserActivityApi
            .getUserActivities(
              userId,
              page,
              PAGE_SIZE,
            );

        setActivities(
          response.data?.content ?? [],
        );

        setTotalPages(
          Math.max(
            1,
            Number(
              response.data
                ?.totalPages ?? 1,
            ),
          ),
        );

        setTotalElements(
          Number(
            response.data
              ?.totalElements ?? 0,
          ),
        );
      } catch (
        requestError: any
      ) {
        console.error(
          "Cannot load user activities:",
          requestError,
        );

        setError(
          requestError?.response
            ?.data?.message ||
            requestError?.response
              ?.data?.error ||
            "Cannot load this user's activity history.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      page,
      userId,
    ]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
              <Activity className="h-5 w-5 text-blue-600" />

              User Activities
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {userName} ·{" "}
              {totalElements} recorded
              actions
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close activity history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <RefreshCcw className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <p className="font-bold text-red-600 dark:text-red-300">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadActivities()
                }
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : activities.length ===
            0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Activity className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />

              <p className="font-bold text-slate-700 dark:text-slate-200">
                No activity records found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">
                      Time
                    </th>

                    <th className="px-4 py-3">
                      Action
                    </th>

                    <th className="px-4 py-3">
                      Target
                    </th>

                    <th className="px-4 py-3">
                      IP Address
                    </th>

                    <th className="px-4 py-3">
                      User Agent
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activities.map(
                    (activity) => (
                      <tr
                        key={
                          activity.id
                        }
                        className="align-top"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {formatDateTime(
                            activity.createdAt,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                            {activity.action ||
                              "UNKNOWN"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {activity.targetType ||
                            "-"}

                          {activity.targetId
                            ? ` #${activity.targetId}`
                            : ""}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {activity.ipAddress ||
                            "-"}
                        </td>

                        <td className="max-w-80 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="line-clamp-2">
                            {activity.userAgent ||
                              "-"}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {page + 1} of{" "}
            {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      0,
                      current - 1,
                    ),
                )
              }
              disabled={
                page <= 0 ||
                loading
              }
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      totalPages -
                        1,
                      current +
                        1,
                    ),
                )
              }
              disabled={
                page >=
                  totalPages -
                    1 ||
                loading
              }
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}