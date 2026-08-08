import { BookOpen, CircleHelp, ExternalLink, Keyboard, LifeBuoy, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const helpTopics = [
    {
        icon: BookOpen,
        title: "Getting started",
        description: "Learn how dashboards, imports and financial records fit together.",
        href: "https://github.com/SaulMoreno3/FinanceApp#readme",
    },
    {
        icon: Keyboard,
        title: "Report a problem",
        description: "Include what you expected, what happened and the steps to reproduce it.",
        href: "https://github.com/SaulMoreno3/FinanceApp/issues/new",
    },
];

export default function SupportPage() {
    return (
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
            <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Support</p>
                <h2 className="text-3xl font-bold tracking-tight">How can we help?</h2>
                <p className="max-w-2xl text-muted-foreground">Find product information, report an issue or contact the FinanceApp team.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                {helpTopics.map((topic) => (
                    <Card key={topic.title} className="transition-colors hover:border-foreground/20">
                        <CardHeader>
                            <topic.icon className="mb-2 h-6 w-6 text-muted-foreground" />
                            <CardTitle>{topic.title}</CardTitle>
                            <CardDescription>{topic.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="outline" className="w-full sm:w-auto">
                                <a href={topic.href} target="_blank" rel="noreferrer">Open resource <ExternalLink className="h-4 w-4" /></a>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="overflow-hidden border-primary/15 bg-linear-to-br from-card to-muted/40">
                <CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                        <LifeBuoy className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">Need personal assistance?</h3>
                        <p className="text-sm text-muted-foreground">Contact support with your account email and a short description. Never send passwords or financial documents.</p>
                    </div>
                    <Button asChild>
                        <a href="mailto:support@financeapp.app?subject=FinanceApp%20support"><Mail className="h-4 w-4" /> Email support</a>
                    </Button>
                </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CircleHelp className="h-3.5 w-3.5" />
                FinanceApp account support
            </div>
        </div>
    );
}
