"use client";

import { useState } from "react";

const DAY = 86_400_000;

export function NeededByField({ today }: { today: string }) {
  const [value, setValue] = useState("");
  const warn = value !== "" && new Date(`${value}T00:00:00Z`).getTime() < new Date(`${today}T00:00:00Z`).getTime() + 7 * DAY;
  return (
    <label className="field">Needed by
      <input type="date" name="neededBy" required value={value} onChange={(event) => setValue(event.target.value)} />
      {warn ? <span className="hint warn">This is less than 7 days away. Say so in the description if it really cannot wait.</span> : null}
    </label>
  );
}
