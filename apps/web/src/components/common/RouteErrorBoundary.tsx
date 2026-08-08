import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function getErrorMessage(error: unknown) {
    if (isRouteErrorResponse(error)) {
        return error.statusText || `Error ${error.status}`;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ha ocurrido un error inesperado.";
}

export default function RouteErrorBoundary() {
    const error = useRouteError();
    const message = getErrorMessage(error);

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <Card className="w-full max-w-lg">
                <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">Algo no ha cargado bien</h1>
                        <p className="text-sm text-muted-foreground">
                            Prueba a recargar la página. Si sigue pasando, vuelve al inicio y continúa desde ahí.
                        </p>
                        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{message}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="button" onClick={() => window.location.reload()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Recargar
                        </Button>
                        <Button type="button" variant="outline" onClick={() => window.location.assign("/")}>
                            <Home className="mr-2 h-4 w-4" />
                            Ir al inicio
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
