import type { Anamnesis } from "@/lib/api/anamnesis";

type AnamnesisKey = keyof Anamnesis;

export const ANAMNESE_SECOES: { titulo: string; itens: { key: AnamnesisKey; label: string }[] }[] =
  [
    {
      titulo: "Objetivos",
      itens: [{ key: "objectives", label: "Objetivos" }],
    },
    {
      titulo: "Dados Clínicos",
      itens: [
        { key: "systolic_pressure", label: "Pressão sistólica" },
        { key: "diastolic_pressure", label: "Pressão diastólica" },
        { key: "variable_glycemia", label: "Glicemia variável" },
        { key: "height", label: "Altura (cm)" },
        { key: "weight", label: "Peso (kg)" },
      ],
    },
    {
      titulo: "Quadro Clínico",
      itens: [
        { key: "medicines", label: "Remédios em uso" },
        { key: "supplements", label: "Reposições / suplementos" },
        { key: "notes", label: "Observações gerais" },
      ],
    },
    {
      titulo: "Histórico Ortopédico",
      itens: [
        { key: "fracture", label: "Fraturas" },
        { key: "dislocations", label: "Luxações" },
        { key: "pain", label: "Dores" },
        { key: "orthopedic_notes", label: "Observações ortopédicas" },
      ],
    },
    {
      titulo: "Hábitos de Vida",
      itens: [
        { key: "meals", label: "Refeições por dia" },
        { key: "hydration", label: "Hidratação" },
        { key: "sleep", label: "Sono" },
        { key: "stool", label: "Fezes" },
        { key: "urine", label: "Urina" },
      ],
    },
  ];
