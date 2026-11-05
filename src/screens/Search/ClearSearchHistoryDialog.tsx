import { ConfirmationDialog } from "../../components/ConfirmationDialog";

interface ClearSearchHistoryDialogProps {
  interactive?: boolean;
  onKeep: () => void;
  onClear: () => void;
}

/** C2 400:18480, centered in the device above its home-indicator safe area. */
export function ClearSearchHistoryDialog({ interactive = true, onKeep, onClear }: ClearSearchHistoryDialogProps) {
  return <ConfirmationDialog title="Clear all search history" description="All your search history in this app will be cleared."
    confirmLabel="Clear all" cancelLabel="Keep" destructive interactive={interactive} onCancel={onKeep} onConfirm={onClear} />;
}
