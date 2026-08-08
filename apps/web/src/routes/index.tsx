import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import AuthLayout from "@/layouts/AuthLayout";
import MainLayout from "@/layouts/MainLayout";
import { transactionsRoutes } from "./transactions.routes";
import { AuthProvider } from "@/components/common/AuthContext";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("@/pages/auth/SignUpPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const PortfolioPage = lazy(() => import("@/pages/portfolio/PortfolioPage"));
const PortfolioAnalysisPage = lazy(() => import("@/pages/portfolio/PortfolioAnalysisPage"));
const ImportPage = lazy(() => import("@/pages/import-data/ImportPage"));
const NetWorthPage = lazy(() => import("@/pages/net-worth/NetWorthPage"));
const SalaryPage = lazy(() => import("@/pages/salary/SalaryPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));

const deferred = (page: ReactNode) => <Suspense fallback={null}>{page}</Suspense>;

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
            element: deferred(<LoginPage />),
          },
          {
            path: "/register",
            element: deferred(<SignUpPage />),
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
                element: deferred(<DashboardPage />),
              },
              {
                path: "networth",
                element: deferred(<NetWorthPage />),
              },
              {
                path: "import",
                element: deferred(<ImportPage />),
              },
              {
                path: "salary",
                element: deferred(<SalaryPage />),
              },
              {
                path: "reports",
                element: deferred(<ReportsPage />),
              },
              ...transactionsRoutes,
              {
                path: "portfolio",
                children: [
                  {
                    path: "",
                    element: deferred(<PortfolioPage />),
                  },
                  {
                    path: ":symbol",
                    element: deferred(<PortfolioAnalysisPage />),
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
