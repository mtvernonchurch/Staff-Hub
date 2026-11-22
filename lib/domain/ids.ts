import { randomBytes } from "crypto";

export function newId(prefix: string): string {
  return `${prefix}${randomBytes(4).toString("hex")}`;
}
