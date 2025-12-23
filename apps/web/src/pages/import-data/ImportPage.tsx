import { useState } from 'react';
import { FilePond } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

// Import FilePond styles
import 'filepond/dist/filepond.min.css';

export default function ImportPage() {
    const [myInvestorFiles, setMyInvestorFiles] = useState<any[]>([]);
    const [revolutFiles, setRevolutFiles] = useState<any[]>([]);

    // Mock last updated times (in a real app, fetch from backend)
    const lastUpdatedMyInvestor = "2 days ago";
    const lastUpdatedRevolut = "1 week ago";

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
                <p className="text-muted-foreground">
                    Upload your bank statements to update your portfolio.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* MyInvestor Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>MyInvestor</CardTitle>
                        <CardDescription>Upload CSV files (Movimientos / Órdenes)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="filepond-wrapper dark-mode">
                            <FilePond
                                files={myInvestorFiles}
                                onupdatefiles={setMyInvestorFiles}
                                allowMultiple={true}
                                maxFiles={3}
                                name="files"
                                labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
                            />
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Last updated: {lastUpdatedMyInvestor}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Revolut Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revolut</CardTitle>
                        <CardDescription>Upload CSV or JSON exports</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="filepond-wrapper dark-mode">
                            <FilePond
                                files={revolutFiles}
                                onupdatefiles={setRevolutFiles}
                                allowMultiple={true}
                                maxFiles={3}
                                name="files"
                                labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
                            />
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Last updated: {lastUpdatedRevolut}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Custom Styles for FilePond to match Dark Mode */}
            <style>{`
        .filepond--panel-root {
            background-color: hsl(var(--secondary));
            border: 1px solid hsl(var(--border));
        }
        .filepond--drop-label {
            color: hsl(var(--muted-foreground));
        }
        .filepond--label-action {
            text-decoration-color: hsl(var(--primary));
        }
        .filepond--item-panel {
            background-color: hsl(var(--primary));
        }
        .filepond--credits {
            display: none;
        }
      `}</style>
        </div>
    );
}
