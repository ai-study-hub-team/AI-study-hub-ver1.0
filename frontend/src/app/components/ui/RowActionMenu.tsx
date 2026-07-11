import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

const actionIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300";

interface MenuPosition {
  top: number;
  left: number;
}

const VIEWPORT_PADDING = 12;
const MENU_GAP = 6;

export function RowActionMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: VIEWPORT_PADDING,
    left: VIEWPORT_PADDING,
  });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const anchorRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const maxLeft = Math.max(
      VIEWPORT_PADDING,
      window.innerWidth - menuRect.width - VIEWPORT_PADDING,
    );
    const maxTop = Math.max(
      VIEWPORT_PADDING,
      window.innerHeight - menuRect.height - VIEWPORT_PADDING,
    );

    const preferredLeft = anchorRect.right - menuRect.width;
    const openBelowTop = anchorRect.bottom + MENU_GAP;
    const openAboveTop = anchorRect.top - menuRect.height - MENU_GAP;
    const preferredTop =
      openBelowTop + menuRect.height <= window.innerHeight - VIEWPORT_PADDING
        ? openBelowTop
        : openAboveTop >= VIEWPORT_PADDING
          ? openAboveTop
          : Math.min(Math.max(anchorRect.top, VIEWPORT_PADDING), maxTop);

    const nextPosition = {
      top: Math.min(Math.max(preferredTop, VIEWPORT_PADDING), maxTop),
      left: Math.min(Math.max(preferredLeft, VIEWPORT_PADDING), maxLeft),
    };

    setMenuPosition((current) =>
      current.top === nextPosition.top && current.left === nextPosition.left
        ? current
        : nextPosition,
    );
  }, []);

  useLayoutEffect(() => {
    if (open) updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const schedulePositionUpdate = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateMenuPosition();
      });
    };

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("scroll", schedulePositionUpdate, true);
    window.addEventListener("resize", schedulePositionUpdate);
    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      window.removeEventListener("resize", schedulePositionUpdate);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [open, updateMenuPosition]);

  return (
    <div className="flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={actionIconButtonClass}
        title="More actions"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] min-w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              maxHeight: `calc(100vh - ${VIEWPORT_PADDING * 2}px)`,
            }}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function ActionMenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onClick();
      }}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
          : "text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
