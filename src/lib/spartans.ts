export type AssistType = "birthday" | "medical" | "calamity" | "maternity";

export const TYPES: { key: AssistType; label: string; emoji: string; color: string; tone: string }[] = [
  { key: "birthday",  label: "Birthday Gift",        emoji: "🎁", color: "var(--color-type-birthday)",  tone: "#FEF3C7" },
  { key: "medical",   label: "Medical Assistance",   emoji: "🏥", color: "var(--color-type-medical)",   tone: "#FEE2E2" },
  { key: "calamity",  label: "Calamity Assistance",  emoji: "⛈️", color: "var(--color-type-calamity)",  tone: "#DBEAFE" },
  { key: "maternity", label: "Maternity Assistance", emoji: "🤱", color: "var(--color-type-maternity)", tone: "#F5D0FE" },
];

export const typeMeta = (t: AssistType) => TYPES.find((x) => x.key === t)!;

export function peso(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return "₱" + v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function genRegistrationCode(): string {
  return "REG-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function genContributionCode(type: AssistType): string {
  const prefix = type.slice(0, 3).toUpperCase();
  return prefix + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
