import { Badge } from "@/frontend/components/ui/Badge";
import { formatDateTimeHu, toBucharestTime } from "@/shared/datetime/datetime";
import type { CalendarProposal } from "@/shared/types/calendar";
import type { FormState } from "@/shared/types/form";
import { WithdrawProposalButton } from "./WithdrawProposalButton";

/** A naptárban egy függő áthelyezési javaslat: kinek, honnan hová, meddig válaszolhat; visszavonás. */
export function ProposalDetails({ proposal, onDone }: { proposal: CalendarProposal; onDone: (state: FormState) => void }) {
  return (
    <div className="space-y-4">
      <Badge tone="warning">A vendég válaszára vár</Badge>
      <p>
        <span className="font-semibold">{proposal.customerName}</span> · {proposal.serviceName}
      </p>
      <p className="rounded-lg bg-background px-4 py-3">
        <span className="text-muted">{formatDateTimeHu(proposal.currentStartsAt)}</span>
        {" → "}
        <span className="font-semibold text-brass">
          {formatDateTimeHu(proposal.startsAt)} – {toBucharestTime(proposal.endsAt)}
        </span>
      </p>
      <p className="text-sm text-muted">
        Ha {formatDateTimeHu(proposal.expiresAt)}-ig nem válaszol, a régi időpont marad, és te döntöd el, mi legyen vele.
      </p>
      <WithdrawProposalButton rescheduleId={proposal.id} onDone={onDone} />
    </div>
  );
}
