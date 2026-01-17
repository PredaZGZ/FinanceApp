import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SalaryList from "@/components/salary/SalaryList";
import SalaryForm from "@/components/salary/SalaryForm";
import SalaryDetailModal from "@/components/salary/SalaryDetail";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function SalaryPage() {
    console.log("SalaryPage mounted");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [viewingId, setViewingId] = useState<string | null>(null);

    const handleCreateSuccess = () => {
        setIsCreateOpen(false);
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="space-y-8 py-8 container mx-auto max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Salaries</h1>
                    <p className="text-muted-foreground mt-1">Manage your payrolls and income history.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} size="lg" className="shadow-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Record
                </Button>
            </div>

            <SalaryList
                refreshTrigger={refreshTrigger}
                onView={setViewingId}
            />

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Salary</DialogTitle>
                    </DialogHeader>
                    <SalaryForm
                        onSuccess={handleCreateSuccess}
                        onCancel={() => setIsCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <SalaryDetailModal
                salaryId={viewingId}
                onClose={() => setViewingId(null)}
            />
        </div>
    );
}
