import { createBrowserRouter, Navigate } from "react-router";

import { RootLayout } from "../layouts/RootLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";

import { LandingPage } from "./pages/LandingPage";

import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { EmailVerificationPage } from "./pages/auth/EmailVerificationPage";
import { VerifyEmailSuccessPage } from "./pages/auth/VerifyEmailSuccessPage";
import VerifyResetCodePage from "./pages/auth/VerifyResetCodePage";

import { StudentDashboard } from "./pages/dashboard/StudentDashboard";

import { TrashPage } from "./pages/trash/TrashPage";
import { UploadDocumentsPage } from "./pages/upload/UploadDocumentsPage";
import { MyLibrary } from "./pages/library/MyLibrary";
import { AllCategoriesPage } from "./pages/library/AllCategoriesPage";
import { LibraryCategoryDocumentsPage } from "./pages/library/LibraryCategoryDocumentsPage";
import { AllDocumentsPage } from "./pages/library/AllDocumentsPage";
import { DocumentPreviewPage } from "./pages/library/DocumentPreviewPage";
import { FavoriteDocumentsPage } from "./pages/library/FavoriteDocumentsPage";

import { AIChatPage } from "./pages/chat/AIChatPage";
import { AISummaryPage } from "./pages/summary/AISummaryPage";
import { QuizGeneratorPage } from "./pages/quiz/QuizGeneratorPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { StorageDashboard } from "./pages/storage/StorageDashboard";
import { CategoriesPage } from "./pages/categories/CategoriesPage";
import { CategoryDocumentsPage } from "./pages/categories/CategoryDocumentsPage";
import { FoldersPage } from "./pages/folders/FoldersPage";
import { FolderDocumentsPage } from "./pages/folders/FolderDocumentsPage";
import { PricingPage } from "./pages/subscription/PricingPage";
import { SubscriptionDashboard } from "./pages/subscription/SubscriptionDashboard";
import { UpgradePlanPage } from "./pages/subscription/UpgradePlanPage";

import { DocumentSharesPage } from "./pages/shares/DocumentSharesPage";
import { PublicDocumentPage } from "./pages/public/PublicDocumentPage";

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
      { path: "verify-reset-code", element: <VerifyResetCodePage /> },
      { path: "pricing", element: <PricingPage /> },

      // Public document share routes
      {
        path: "public/documents/:token",
        element: <PublicDocumentPage />,
      },
      {
        path: "share/:token",
        element: <PublicDocumentPage />,
      },

      {
        path: "app",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <StudentDashboard /> },
          { path: "upload", element: <UploadDocumentsPage /> },

          { path: "library", element: <MyLibrary /> },
          { path: "library/categories", element: <AllCategoriesPage /> },
          {
            path: "library/categories/:categoryId",
            element: <LibraryCategoryDocumentsPage />,
          },
          { path: "library/documents", element: <AllDocumentsPage /> },
          {
            path: "library/:id/preview",
            element: <DocumentPreviewPage />,
          },
          { path: "library/favorites", element: <FavoriteDocumentsPage /> },

          {
            path: "shares",
            element: <DocumentSharesPage />,
          },

          { path: "folders", element: <FoldersPage /> },
          { path: "folders/:folderId", element: <FolderDocumentsPage /> },

          { path: "trash", element: <TrashPage /> },
          { path: "chat", element: <AIChatPage /> },
          { path: "summary", element: <AISummaryPage /> },
          { path: "quiz", element: <QuizGeneratorPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "storage", element: <StorageDashboard /> },
          { path: "categories", element: <CategoriesPage /> },
          {
            path: "categories/:categoryId",
            element: <CategoryDocumentsPage />,
          },
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