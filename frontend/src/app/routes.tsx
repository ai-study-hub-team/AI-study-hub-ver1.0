import {
  createBrowserRouter,
  Navigate,
} from "react-router";

import { RootLayout } from "../layouts/RootLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";

import { LandingPage } from "./pages/LandingPage";

// Authentication
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { CheckEmailPage } from "./pages/auth/CheckEmailPage";
import { EmailVerificationPage } from "./pages/auth/EmailVerificationPage";
import { VerifyEmailSuccessPage } from "./pages/auth/VerifyEmailSuccessPage";
import VerifyResetCodePage from "./pages/auth/VerifyResetCodePage";
import { NotificationsPage } from "./components/notifications/NotificationsPage";

// Student dashboard
import { StudentDashboard } from "./pages/dashboard/StudentDashboard";

// Document and library
import { TrashPage } from "./pages/trash/TrashPage";
import { UploadDocumentsPage } from "./pages/upload/UploadDocumentsPage";
import { MyLibrary } from "./pages/library/MyLibrary";
import { AllCategoriesPage } from "./pages/library/AllCategoriesPage";
import { LibraryCategoryDocumentsPage } from "./pages/library/LibraryCategoryDocumentsPage";
import { AllDocumentsPage } from "./pages/library/AllDocumentsPage";
import { DocumentPreviewPage } from "./pages/library/DocumentPreviewPage";
import { FavoriteDocumentsPage } from "./pages/library/FavoriteDocumentsPage";

// AI features
import { AIChatPage } from "./pages/chat/AIChatPage";
import { AISummaryPage } from "./pages/summary/AISummaryPage";
import { QuizGeneratorPage } from "./pages/quiz/QuizGeneratorPage";

// User features
import { ProfilePage } from "./pages/profile/ProfilePage";
import { ChangePasswordPage } from "./pages/profile/ChangePasswordPage";
import { StorageDashboard } from "./pages/storage/StorageDashboard";
import { CategoriesPage } from "./pages/categories/CategoriesPage";
import { CategoryDocumentsPage } from "./pages/categories/CategoryDocumentsPage";
import { FoldersPage } from "./pages/folders/FoldersPage";
import { FolderDocumentsPage } from "./pages/folders/FolderDocumentsPage";

// Subscription
import { PricingPage } from "./pages/subscription/PricingPage";
import { SubscriptionDashboard } from "./pages/subscription/SubscriptionDashboard";
import { UpgradePlanPage } from "./pages/subscription/UpgradePlanPage";

// Sharing
import { MySharedDocumentsPage } from "./pages/shares/MySharedDocumentsPage";
import { DocumentSharesPage } from "./pages/shares/DocumentSharesPage";
import { SharedWithMePage } from "./pages/shares/SharedWithMePage";
import { SharedFolderDocumentsPage } from "./pages/shares/SharedFolderDocumentsPage";

// Public sharing
import { PublicDocumentPage } from "./pages/public/PublicDocumentPage";
import { PublicSharedUploadPage } from "./pages/public/PublicSharedUploadPage";

// Admin
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UserManagement } from "./pages/admin/UserManagement";
import { DocumentAdmin } from "./pages/admin/DocumentAdmin";
import { ReportManagement } from "./pages/admin/ReportManagement";
import { AnalyticsDashboard } from "./pages/admin/AnalyticsDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // Landing page
      {
        index: true,
        element: <LandingPage />,
      },

      // Authentication routes
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "check-email",
        element: <CheckEmailPage />,
      },
      {
        path: "verify-email",
        element: <EmailVerificationPage />,
      },
      {
        path: "verify-email-success",
        element: <VerifyEmailSuccessPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },

      // Public pricing page
      {
        path: "pricing",
        element: <PricingPage />,
      },

      // Public document sharing routes
      {
        path: "public/documents/:token",
        element: <PublicDocumentPage />,
      },
      {
        path: "share/:token",
        element: <PublicDocumentPage />,
      },
      {
        path: "shared-upload/:token",
        element: <PublicSharedUploadPage />,
      },

      // User application routes
      {
        path: "app",
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: (
              <Navigate
                to="dashboard"
                replace
              />
            ),
          },

          // Dashboard
          {
            path: "dashboard",
            element: <StudentDashboard />,
          },

          // Upload
          {
            path: "upload",
            element: <UploadDocumentsPage />,
          },

          // Library
          {
            path: "library",
            element: <MyLibrary />,
          },
          {
            path: "library/categories",
            element: <AllCategoriesPage />,
          },
          {
            path: "library/categories/:categoryId",
            element: (
              <LibraryCategoryDocumentsPage />
            ),
          },
          {
            path: "library/documents",
            element: <AllDocumentsPage />,
          },
          {
            path: "library/:id/preview",
            element: <DocumentPreviewPage />,
          },
          {
            path: "library/favorites",
            element: <FavoriteDocumentsPage />,
          },

          // Sharing
          {
            path: "my-shared-documents",
            element: <MySharedDocumentsPage />,
          },
          {
            path: "shares",
            element: <DocumentSharesPage />,
          },
          {
            path: "shared-with-me",
            element: <SharedWithMePage />,
          },
          {
            path: "shared/folders/:folderId",
            element: (
              <SharedFolderDocumentsPage />
            ),
          },

          // Folders
          {
            path: "folders",
            element: <FoldersPage />,
          },
          {
            path: "folders/:folderId",
            element: <FolderDocumentsPage />,
          },

          // Trash
          {
            path: "trash",
            element: <TrashPage />,
          },

          // AI features
          {
            path: "chat",
            element: <AIChatPage />,
          },
          {
            path: "summary",
            element: <AISummaryPage />,
          },
          {
            path: "quiz",
            element: <QuizGeneratorPage />,
          },

          // Profile
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
  path: "notifications",
  element: <NotificationsPage />,
},
          {
            path: "change-password",
            element: <ChangePasswordPage />,
          },

          // Storage
          {
            path: "storage",
            element: <StorageDashboard />,
          },

          // Categories
          {
            path: "categories",
            element: <CategoriesPage />,
          },
          {
            path: "categories/:categoryId",
            element: <CategoryDocumentsPage />,
          },

          // Subscription
          {
            path: "subscription",
            element: <SubscriptionDashboard />,
          },
          {
            path: "subscription/upgrade",
            element: <UpgradePlanPage />,
          },
        ],
      },

      // Admin routes
      {
        path: "admin",
        element: <DashboardLayout isAdmin />,
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: "users",
            element: <UserManagement />,
          },
          {
            path: "documents",
            element: <DocumentAdmin />,
          },
          {
            path: "reports",
            element: <ReportManagement />,
          },
          {
            path: "analytics",
            element: <AnalyticsDashboard />,
          },
        ],
      },

      // Unknown route
      {
        path: "*",
        element: (
          <Navigate
            to="/"
            replace
          />
        ),
      },
    ],
  },
]);