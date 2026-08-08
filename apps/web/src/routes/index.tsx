import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import MainLayout from "@/layouts/MainLayout";
import LoginPage from "@/pages/auth/LoginPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import PortfolioPage from "@/pages/portfolio/PortfolioPage";
import PortfolioAnalysisPage from "@/pages/portfolio/PortfolioAnalysisPage";

import ImportPage from "@/pages/import-data/ImportPage";
import NetWorthPage from "@/pages/net-worth/NetWorthPage";
import SalaryPage from "@/pages/salary/SalaryPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import AccountSettingsPage from "@/pages/settings/AccountSettingsPage";
import SupportPage from "@/pages/support/SupportPage";
import { transactionsRoutes } from "./transactions.routes";
import { AuthProvider } from "@/components/common/AuthContext";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/login",
            element: <LoginPage />,
          },
          {
            path: "/register",
            element: <SignUpPage />,
          },
        ],
      },
      {
        path: "/",
        element: <ProtectedRoute />,
        children: [
          {
            element: <MainLayout />,
            children: [
              {
                path: "",
                element: <DashboardPage />,
              },
              {
                path: "networth",
                element: <NetWorthPage />,
              },
              {
                path: "import",
                element: <ImportPage />,
              },
              {
                path: "salary",
                element: <SalaryPage />,
              },
              {
                path: "reports",
                element: <ReportsPage />,
              },
              {
                path: "projects",
                element: <ProjectsPage />,
              },
              {
                path: "settings",
                element: <AccountSettingsPage />,
              },
              {
                path: "support",
                element: <SupportPage />,
              },
              ...transactionsRoutes,
              {
                path: "portfolio",
                children: [
                  {
                    path: "",
                    element: <PortfolioPage />,
                  },
                  {
                    path: ":symbol",
                    element: <PortfolioAnalysisPage />,
                  }
                ]
              },
            ]
          }
        ],
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ]
  }
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
