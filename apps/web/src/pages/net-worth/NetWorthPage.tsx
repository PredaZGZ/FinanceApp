import { useState, useEffect, useCallback } from "react";
import { fetchAPI, postAPI } from "@/lib/api";
import type { Asset, NetWorthSummary } from "@/components/net-worth/net-worth.types";
import { NetWorthSummaryCard } from "@/components/net-worth/NetWorthSummary";
import { AssetsTable } from "@/components/net-worth/AssetsTable";
import { AssetDialog } from "@/components/net-worth/AssetDialog";
import { ValuationDialog } from "@/components/net-worth/ValuationDialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export default function NetWorthPage() {
    const [summary, setSummary] = useState<NetWorthSummary | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog states
    const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
    const [isValuationDialogOpen, setIsValuationDialogOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [summaryData, assetsData] = await Promise.all([
                fetchAPI<NetWorthSummary>('/networth/summary'),
                fetchAPI<{ data: Asset[] }>('/networth/assets?limit=100')
            ]);
            setSummary(summaryData);
            setAssets(assetsData.data);
        } catch (error) {
            console.error("Failed to fetch net worth data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateAsset = async (data: any) => {
        await postAPI('/networth/assets', data);
        await fetchData();
    };

    const handleUpdateAsset = async (data: any) => {
        if (!selectedAsset) return;
        await fetchAPI(`/networth/assets/${selectedAsset.id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        await fetchData();
    };

    const handleDeleteAsset = async (asset: Asset) => {
        if (confirm(`Are you sure you want to delete ${asset.name}?`)) {
            await fetchAPI(`/networth/assets/${asset.id}`, { method: 'DELETE' });
            await fetchData();
        }
    };

    const handleRevalueAsset = async (data: any) => {
        if (!selectedAsset) return;
        // Ensure valuedAt is proper ISO string if included
        const payload = {
            ...data,
            valuedAt: data.valuedAt ? new Date(data.valuedAt).toISOString() : undefined
        };
        await postAPI(`/networth/assets/${selectedAsset.id}/valuations`, payload);
        await fetchData();
    };

    const openCreateDialog = () => {
        setSelectedAsset(null);
        setIsAssetDialogOpen(true);
    };

    const openEditDialog = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsAssetDialogOpen(true);
    };

    const openRevalueDialog = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsValuationDialogOpen(true);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Net Worth</h1>
                <Button onClick={openCreateDialog}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Asset
                </Button>
            </div>

            <NetWorthSummaryCard summary={summary} isLoading={isLoading} />

            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Assets</h2>
                <AssetsTable
                    assets={assets}
                    isLoading={isLoading}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteAsset}
                    onRevalue={openRevalueDialog}
                />
            </div>

            <AssetDialog
                open={isAssetDialogOpen}
                onOpenChange={setIsAssetDialogOpen}
                asset={selectedAsset}
                onSubmit={selectedAsset ? handleUpdateAsset : handleCreateAsset}
            />

            <ValuationDialog
                open={isValuationDialogOpen}
                onOpenChange={setIsValuationDialogOpen}
                asset={selectedAsset}
                onSubmit={handleRevalueAsset}
            />
        </div>
    );
}
