import type { RouteObject } from "react-router-dom";
import TransactionsPage from "@/pages/transactions/TransactionsPage";

export const transactionsRoutes: RouteObject[] = [
    {
        path: "transactions",
        element: <TransactionsPage />,
    },
];
