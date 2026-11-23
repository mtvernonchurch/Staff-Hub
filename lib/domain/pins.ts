import type { StaffPin } from "@/lib/data/types";
import { parseSheetDate } from "@/lib/domain/dates";

/** A blank show-until date stays up. The pin is still visible on the show-until day. */
export function pinIsVisible(pin: Pick<StaffPin, "showUntil">, today: Date): boolean {
  const until = parseSheetDate(pin.showUntil);
  if (!until) return true;
  return until.getTime() >= today.getTime();
}

export function isUrgentPin(priority: string): boolean {
  return priority.trim().toLowerCase() === "urgent";
}

function byNewest(pins: StaffPin[]): StaffPin[] {
  return pins
    .map((pin, index) => ({ pin, index }))
    .sort((a, b) => {
      const left = parseSheetDate(a.pin.posted)?.getTime() ?? 0;
      const right = parseSheetDate(b.pin.posted)?.getTime() ?? 0;
      if (left !== right) return right - left;
      return b.index - a.index;
    })
    .map(({ pin }) => pin);
}

export function visibleStaffPins(pins: StaffPin[], today: Date): StaffPin[] {
  return byNewest(pins.filter((pin) => pinIsVisible(pin, today)));
}

export function hiddenStaffPins(pins: StaffPin[], today: Date): StaffPin[] {
  return byNewest(pins.filter((pin) => !pinIsVisible(pin, today)));
}
