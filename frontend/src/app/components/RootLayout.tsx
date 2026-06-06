import { Outlet } from "react-router";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Outlet />
    </div>
  );
}
