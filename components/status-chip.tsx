import { statusTone } from "@/lib/domain/request-desk";

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip status-${statusTone(status)}`}>{status}</span>;
}
