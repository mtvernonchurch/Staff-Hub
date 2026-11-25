import { describe, expect, it } from "vitest";
import { DOCK_TABS, dockActive } from "@/lib/dock";

const meetings = DOCK_TABS.find((tab) => tab.label === "Meetings")!;

describe("dock", () => {
  it("puts Meetings between Calendar and Requests", () => {
    expect(DOCK_TABS.map((tab) => tab.label)).toEqual(["Home", "Tasks", "Calendar", "Meetings", "Requests", "Resources"]);
  });

  it("lights Meetings for the list, a meeting, and Meeting mode, and not for Calendar", () => {
    expect(dockActive("/meetings", meetings)).toBe(true);
    expect(dockActive("/meetings/mtg_monday", meetings)).toBe(true);
    expect(dockActive("/meeting", meetings)).toBe(true);
    expect(dockActive("/this-week", meetings)).toBe(false);
    const calendar = DOCK_TABS.find((tab) => tab.label === "Calendar")!;
    expect(dockActive("/meeting", calendar)).toBe(false);
    expect(dockActive("/meetings", calendar)).toBe(false);
  });
});