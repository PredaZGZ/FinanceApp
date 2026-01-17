import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import MainLayout from "@/layouts/MainLayout";
import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import PortfolioPage from "@/pages/portfolio/PortfolioPage";
import PortfolioAnalysisPage from "@/pages/portfolio/PortfolioAnalysisPage";

import ImportPage from "@/pages/import-data/ImportPage";
import NetWorthPage from "@/pages/net-worth/NetWorthPage";
import SalaryPage from "@/pages/salary/SalaryPage";
import { transactionsRoutes } from "./transactions.routes";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <AuthLayout />,
    children: [
      {
        path: "",
        element: <LoginPage />,
      },
    ],
  },
  {
    path: "/",
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
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
// Routes update


export default function AppRouter() {
  return <RouterProvider router={router} />;
}
