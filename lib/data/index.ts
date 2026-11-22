import "server-only";
import { cache } from "react";
import { dataMode } from "@/lib/config";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import { SheetsStore } from "@/lib/data/sheets-store";
import type { HubStore } from "@/lib/data/types";
import { createGoogleSheetsApi } from "@/lib/sheets/google-api";

const globalStore = globalThis as typeof globalThis & { __mvStaffHub?: MemoryStore };

function mockStore(): MemoryStore {
  if (!globalStore.__mvStaffHub) globalStore.__mvStaffHub = new MemoryStore(createSeed());
  return globalStore.__mvStaffHub;
}

export const getStore = cache(async (): Promise<HubStore> => {
  if (dataMode() === "mock") return mockStore();
  return new SheetsStore(createGoogleSheetsApi());
});
