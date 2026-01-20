
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Asset } from "./net-worth.types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const assetSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    category: z.string().optional(),
    originalCost: z.coerce.number().min(0, "Cost must be positive"),
    originalCurrency: z.string().default("EUR"),
    notes: z.string().optional(),
    // Initial valuation fields (only for creation)
    initialValuationValue: z.coerce.number().optional(),
    initialValuationDate: z.string().optional(),
    isSold: z.boolean().optional(),
    soldAt: z.string().nullable().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AssetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset?: Asset | null;
    onSubmit: (data: AssetFormValues) => Promise<void>;
}

export function AssetDialog({ open, onOpenChange, asset, onSubmit }: AssetDialogProps) {
    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetSchema as any),
        defaultValues: {
            name: "",
            description: "",
            category: "",
            originalCost: 0,
            originalCurrency: "EUR",
            notes: "",
            initialValuationValue: undefined,
            initialValuationDate: undefined,
            isSold: false,
            soldAt: null,
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: asset?.name || "",
                description: asset?.description || "",
                category: asset?.category || "",
                originalCost: asset?.originalCost || 0,
                originalCurrency: asset?.originalCurrency || "EUR",
                notes: asset?.notes || "",
                isSold: asset?.isSold || false,
                soldAt: asset?.soldAt ? asset.soldAt : null,
            });
        }
    }, [open, asset, form]);

    const handleSubmit = async (data: AssetFormValues) => {
        try {
            await onSubmit(data);
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error("Failed to submit asset", error);
            // In a real app, set form error
        }
    };

    const isEditing = !!asset;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Asset" : "Add Asset"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Make changes to your asset here."
                            : "Add a new asset to your portfolio."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Asset Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Real Estate, Vehicle, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="originalCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cost</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="originalCurrency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Currency</FormLabel>
                                        <FormControl>
                                            <Input placeholder="EUR" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {!isEditing && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="initialValuationValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Initial Value (Optional)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="Current market value" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="initialValuationDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Value Date (Optional)</FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Optional description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Save changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
