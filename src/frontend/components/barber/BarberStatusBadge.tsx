import type { BarberStatus } from "@/shared/types/domain";
import { Badge, type BadgeTone } from "@/frontend/components/ui/Badge";

const LABELS: Record<BarberStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Elbírálás alatt", tone: "warning" },
  approved: { label: "Jóváhagyva", tone: "success" },
  rejected: { label: "Elutasítva", tone: "danger" },
  suspended: { label: "Felfüggesztve", tone: "danger" },
};

/** Barber státusza színes címkeként. */
export function BarberStatusBadge({ status }: { status: BarberStatus }) {
  const { label, tone } = LABELS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
