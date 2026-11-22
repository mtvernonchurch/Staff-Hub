export const CARE_ACTIONS = ["Visit", "Card", "Flowers", "Call", "Meal", "Other"] as const;

export function careActionLabel(note: { action: string; custom: string }): string {
  return note.action === "Other" && note.custom.trim() ? note.custom.trim() : note.action;
}

export function careTaskText(note: { person: string; action: string; custom: string }): string {
  return `Care note: ${careActionLabel(note)} for ${note.person}`;
}
