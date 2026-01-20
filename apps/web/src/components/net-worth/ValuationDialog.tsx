
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

const valuationSchema = z.object({
    value: z.coerce.number(),
    currency: z.string().default("EUR"),
    valuedAt: z.string().optional(), // In form checks we might use string for datetime-local
    source: z.string().optional(),
});

type ValuationFormValues = z.infer<typeof valuationSchema>;

interface ValuationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: Asset | null;
    onSubmit: (data: ValuationFormValues) => Promise<void>;
}

export function ValuationDialog({ open, onOpenChange, asset, onSubmit }: ValuationDialogProps) {
    const form = useForm<ValuationFormValues>({
        resolver: zodResolver(valuationSchema as any),
        defaultValues: {
            value: 0,
            currency: "EUR",
            valuedAt: new Date().toISOString().slice(0, 16), // Format to YYYY-MM-DDTHH:mm
            source: "",
        },
    });

    const handleSubmit = async (data: ValuationFormValues) => {
        try {
            await onSubmit(data);
            onOpenChange(false);
            form.reset({
                value: 0,
                currency: "EUR", // Should arguably stick to asset currency
                valuedAt: new Date().toISOString().slice(0, 16),
                source: "",
            });
        } catch (error) {
            console.error("Failed to submit valuation", error);
        }
    };

    if (!asset) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Revalue Asset</DialogTitle>
                    <DialogDescription>
                        Add a new valuation for {asset.name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Value</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="currency"
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

                        <FormField
                            control={form.control}
                            name="valuedAt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date & Time</FormLabel>
                                    <FormControl>
                                        <Input type="datetime-local" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="source"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Market appraisal" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Add Valuation</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
