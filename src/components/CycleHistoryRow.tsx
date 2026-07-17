import { Badge } from "@/components/ui/badge";
import type { AttendanceCycleRecord } from "@/lib/api/attendance-cycles";

/** One closed attendance cycle in a history list — shared between the
 * aluno's own Assiduidade page and the personal/admin's Assiduidade dos
 * alunos dialog. */
export function CycleHistoryRow({ cycle }: { cycle: AttendanceCycleRecord }) {
  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div>
        <div className="text-sm font-medium">
          {new Date(cycle.started_at).toLocaleDateString("pt-BR")} —{" "}
          {new Date(cycle.ended_at).toLocaleDateString("pt-BR")}
        </div>
        <div className="text-xs text-muted-foreground">
          {cycle.completed_workouts} / {cycle.contracted_workouts_per_cycle} treinos (
          {cycle.percentage}%)
        </div>
      </div>
      <Badge
        className={
          cycle.status === "exceeded"
            ? "bg-destructive text-destructive-foreground"
            : "bg-success text-success-foreground"
        }
      >
        {cycle.status === "exceeded" ? "Estourou" : "Cumpriu"}
      </Badge>
    </li>
  );
}
