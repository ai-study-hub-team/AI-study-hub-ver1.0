import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "../layouts/RootLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { EmailVerificationPage } from "./pages/auth/EmailVerificationPage";
import { VerifyEmailSuccessPage } from "./pages/auth/VerifyEmailSuccessPage";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { StudentDashboard } from "./pages/dashboard/StudentDashboard";
import { DocumentsPage } from "./pages/documents/DocumentsPage";
import { MyLibrary } from "./pages/library/MyLibrary";
import { AIChatPage } from "./pages/chat/AIChatPage";
import { AISummaryPage } from "./pages/summary/AISummaryPage";
import { QuizGeneratorPage } from "./pages/quiz/QuizGeneratorPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { StorageDashboard } from "./pages/storage/StorageDashboard";
import { PricingPage } from "./pages/subscription/PricingPage";
import { SubscriptionDashboard } from "./pages/subscription/SubscriptionDashboard";
import { UpgradePlanPage } from "./pages/subscription/UpgradePlanPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UserManagement } from "./pages/admin/UserManagement";
import { DocumentAdmin } from "./pages/admin/DocumentAdmin";
import { ReportManagement } from "./pages/admin/ReportManagement";
import { SubscriptionAdmin } from "./pages/admin/SubscriptionAdmin";
import { AnalyticsDashboard } from "./pages/admin/AnalyticsDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "verify-email", element: <EmailVerificationPage /> },
      { path: "verify-email-success", element: <VerifyEmailSuccessPage /> },
      { path: "pricing", element: <PricingPage /> },
      {
        path: "app",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <StudentDashboard /> },
          { path: "documents", element: <DocumentsPage /> },
          { path: "library", element: <MyLibrary /> },
          { path: "chat", element: <AIChatPage /> },
          { path: "summary", element: <AISummaryPage /> },
          { path: "quiz", element: <QuizGeneratorPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "storage", element: <StorageDashboard /> },
          { path: "subscription", element: <SubscriptionDashboard /> },
          { path: "subscription/upgrade", element: <UpgradePlanPage /> },
        ],
      },
      {
        path: "admin",
        element: <DashboardLayout isAdmin />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "users", element: <UserManagement /> },
          { path: "documents", element: <DocumentAdmin /> },
          { path: "reports", element: <ReportManagement /> },
          { path: "subscriptions", element: <SubscriptionAdmin /> },
          { path: "analytics", element: <AnalyticsDashboard /> },
        ],
      },
    ],
  },
]);
