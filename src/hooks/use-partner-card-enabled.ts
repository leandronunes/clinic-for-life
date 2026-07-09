import { useQuery } from "@tanstack/react-query";
import { fetchStudent } from "@/lib/api/students";
import { useAuth } from "@/contexts/use-auth";

/**
 * Whether the current student (or the student being impersonated) has access
 * to the partners' discount card. Defaults to `true` while loading or when
 * not applicable (non-aluno role), so nav items never flicker-hide before the
 * student record loads.
 */
export function usePartnerCardEnabled(): boolean {
  const { effectiveAlunoId, effectiveRole } = useAuth();
  const enabled = effectiveRole === "aluno" && !!effectiveAlunoId;

  const { data } = useQuery({
    queryKey: ["aluno", effectiveAlunoId],
    queryFn: () => fetchStudent(effectiveAlunoId!),
    enabled,
  });

  return data ? data.partner_card_enabled : true;
}
