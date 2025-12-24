import { useState, useEffect } from 'react';
import { FilePond } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

// Import FilePond styles
import 'filepond/dist/filepond.min.css';

export default function ImportPage() {
    const [myInvestorMovements, setMyInvestorMovements] = useState<any[]>([]);
    const [myInvestorOrders, setMyInvestorOrders] = useState<any[]>([]);
    const [revolutFiles, setRevolutFiles] = useState<any[]>([]);

    const [lastUpdatedMyInvestor, setLastUpdatedMyInvestor] = useState<string>("Loading...");
    const [lastUpdatedRevolut, setLastUpdatedRevolut] = useState<string>("Loading...");

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // Assuming endpoint exists as per user request
                const response = await fetch('http://localhost:4000/import/status');
                if (response.ok) {
                    const data = await response.json();
                    // Assuming data format: { myinvestor: string, revolut: string }
                    // We can format the date here if needed, e.g., using date-fns or Intl.DateTimeFormat
                    // For now, assuming the backend sends a readable string or ISO date
                    setLastUpdatedMyInvestor(data.myinvestor ? new Date(data.myinvestor).toLocaleDateString() : "Never");
                    setLastUpdatedRevolut(data.revolut ? new Date(data.revolut).toLocaleDateString() : "Never");
                } else {
                    // Fallback if endpoint doesn't exist yet or fails
                    setLastUpdatedMyInvestor("Unknown");
                    setLastUpdatedRevolut("Unknown");
                }
            } catch (error) {
                console.error("Failed to fetch import status:", error);
                setLastUpdatedMyInvestor("Error");
                setLastUpdatedRevolut("Error");
            }
        };

        fetchStatus();
    }, []);

    const handleUploadMyInvestor = async () => {
        if (myInvestorMovements.length === 0) {
            alert('Please select a Movements file');
            return;
        }

        const formData = new FormData();
        formData.append('movements', myInvestorMovements[0].file);

        if (myInvestorOrders.length > 0) {
            formData.append('orders', myInvestorOrders[0].file);
        }

        try {
            const response = await fetch('http://localhost:4000/import/myinvestor', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const result = await response.json();
            alert(`Success! Imported ${result.data.tradesCount} trades and ${result.data.transfersCount} transfers.`);
            setMyInvestorMovements([]);
            setMyInvestorOrders([]);
        } catch (error: any) {
            console.error(error);
            alert(`Error uploading MyInvestor files: ${error.message}`);
        }
    };

    const handleUploadRevolut = async () => {
        if (revolutFiles.length === 0) {
            alert('Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('file', revolutFiles[0].file);

        try {
            const response = await fetch('http://localhost:4000/import/revolut', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            alert('Success! Revolut data imported.');
            setRevolutFiles([]);
        } catch (error: any) {
            console.error(error);
            alert(`Error uploading Revolut file: ${error.message}`);
        }
    };

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
                <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>MyInvestor</CardTitle>
                        <CardDescription>Upload CSV files</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-6">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Movimientos (Required)</h4>
                            <div className="filepond-wrapper dark-mode">
                                <FilePond
                                    files={myInvestorMovements}
                                    onupdatefiles={setMyInvestorMovements}
                                    allowMultiple={false}
                                    maxFiles={1}
                                    name="movements"
                                    labelIdle='Drag & Drop "Movimientos" CSV'
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Órdenes (Optional)</h4>
                            <div className="filepond-wrapper dark-mode">
                                <FilePond
                                    files={myInvestorOrders}
                                    onupdatefiles={setMyInvestorOrders}
                                    allowMultiple={false}
                                    maxFiles={1}
                                    name="orders"
                                    labelIdle='Drag & Drop "Órdenes" CSV'
                                />
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t flex items-center justify-between">
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="mr-2 h-4 w-4" />
                                <span>Last updated: {lastUpdatedMyInvestor}</span>
                            </div>
                            <button
                                onClick={handleUploadMyInvestor}
                                disabled={myInvestorMovements.length === 0}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                                Upload MyInvestor
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Revolut Section */}
                <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>Revolut</CardTitle>
                        <CardDescription>Upload PDF Statement</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-6">
                        <div className="filepond-wrapper dark-mode">
                            <FilePond
                                files={revolutFiles}
                                onupdatefiles={setRevolutFiles}
                                allowMultiple={false}
                                maxFiles={1}
                                name="file"
                                labelIdle='Drag & Drop PDF Statement'
                            />
                        </div>
                        <div className="mt-auto pt-4 border-t flex items-center justify-between">
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="mr-2 h-4 w-4" />
                                <span>Last updated: {lastUpdatedRevolut}</span>
                            </div>
                            <button
                                onClick={handleUploadRevolut}
                                disabled={revolutFiles.length === 0}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                                Upload Revolut
                            </button>
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
