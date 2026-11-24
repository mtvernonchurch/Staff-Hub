"use client";

import { useState } from "react";
import { OutLink } from "@/components/ui";
import type { WorkflowCard } from "@/lib/data/types";
import { workflowPreview, workflowPreviewCanToggle } from "@/lib/workflows/preview";

export function WorkflowList({ cards }: { cards: WorkflowCard[] }) {
  const [open, setOpen] = useState(false);
  const shown = workflowPreview(cards, open);
  const canToggle = workflowPreviewCanToggle(cards.length);
  return (
    <>
      <div id="workflow-cards">
        {shown.map((card) => <WorkflowRow key={card.id} card={card} />)}
      </div>
      {canToggle ? (
        <button
          className="btn btn-small"
          type="button"
          aria-expanded={open}
          aria-controls="workflow-cards"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </>
  );
}

function WorkflowRow({ card }: { card: WorkflowCard }) {
  const late = /^(yes|true)$/i.test(card.overdue);
  return (
    <article className={late ? "item item-overdue" : "item"}>
      <div>
        <h3>{card.workflow}</h3>
        <p className="meta">
          {card.forPerson ? <span>{card.forPerson}</span> : null}
          <span>{card.step}</span>
          {late ? <span className="chip chip-overdue">Overdue</span> : <span className="chip">Open</span>}
        </p>
      </div>
      <OutLink className="btn btn-small" href={card.link}>Open card</OutLink>
    </article>
  );
}
