import {
  Coins,
  RefreshCcw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  tokenUsageApi,
  type TodayTokenUsageResponse,
} from "../../services/tokenUsageApi";

const EMPTY_USAGE: TodayTokenUsageResponse = {
  total: 0,
  chat: 0,
  summarize: 0,
  quiz: 0,
};

const formatTokenCount = (
  value: number,
): string =>
  new Intl.NumberFormat(
    "en-US",
  ).format(value || 0);

export function TokenUsageBadge() {
  const [
    usage,
    setUsage,
  ] =
    useState<TodayTokenUsageResponse>(
      EMPTY_USAGE,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(false);

  const loadUsage =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(false);

        const response =
          await tokenUsageApi.getTodayUsage();

        setUsage({
          total: Number(
            response.data?.total ?? 0,
          ),
          chat: Number(
            response.data?.chat ?? 0,
          ),
          summarize: Number(
            response.data?.summarize ?? 0,
          ),
          quiz: Number(
            response.data?.quiz ?? 0,
          ),
        });
      } catch (requestError) {
        console.error(
          "Cannot load today's token usage:",
          requestError,
        );

        setError(true);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadUsage();

    const refresh = () => {
      void loadUsage();
    };

    window.addEventListener(
      "token-usage-updated",
      refresh,
    );

    return () =>
      window.removeEventListener(
        "token-usage-updated",
        refresh,
      );
  }, [loadUsage]);

  const title = error
    ? "Cannot load token usage. Click to retry."
    : `Today: ${formatTokenCount(
        usage.total,
      )} total tokens · Chat ${formatTokenCount(
        usage.chat,
      )} · Summary ${formatTokenCount(
        usage.summarize,
      )} · Quiz ${formatTokenCount(
        usage.quiz,
      )}`;

  return (
    <button
      type="button"
      onClick={() => void loadUsage()}
      title={title}
      className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 md:flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {loading ? (
        <RefreshCcw className="h-3.5 w-3.5 animate-spin text-blue-500" />
      ) : (
        <Coins
          className={`h-3.5 w-3.5 ${
            error
              ? "text-red-500"
              : "text-amber-500"
          }`}
        />
      )}

      <span>
        {error
          ? "Token usage"
          : `${formatTokenCount(
              usage.total,
            )} tokens today`}
      </span>
    </button>
  );
}