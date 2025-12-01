import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import MainLayout from "@/layouts/MainLayout";
import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";

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
      // Add more protected routes here
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
