import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";

const TransactionsPage = lazy(() => import("@/pages/transactions/TransactionsPage"));

export const transactionsRoutes: RouteObject[] = [
    {
        path: "transactions",
        element: <Suspense fallback={null}><TransactionsPage /></Suspense>,
    },
];
