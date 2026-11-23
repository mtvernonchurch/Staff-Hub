import Link from "next/link";
import { CreditCard, Wallet } from "lucide-react";
import { Heading } from "@/components/heading";
import type { CardMonth, CardTransaction, MinistryBudget } from "@/lib/data/types";
import { budgetTone, money, yearProgress } from "@/lib/budgets/access";

export function MinistryBudgetCard({
  rows,
  today,
  sample,
  admin,
}: {
  rows: MinistryBudget[];
  today: Date;
  sample: boolean;
  admin: boolean;
}) {
  const year = yearProgress(today);
  const marker = Math.round(year * 100);
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={Wallet}>Ministry budgets</Heading>
        <span className="row-actions">
          {sample ? <span className="sample-chip">Sample</span> : null}
          <Link href="/budgets">Open</Link>
        </span>
      </div>
      {rows.length === 0 ? <p className="empty">No ministry budget is assigned to you.</p> : rows.map((row) => {
        const tone = budgetTone(row.spent, row.annual, year);
        const used = row.annual > 0 ? Math.round((row.spent / row.annual) * 100) : 0;
        return (
          <div key={row.ministry} className="budget-row">
            <div className="budget-label">
              <span>{row.ministry}</span>
              <strong className={tone === "ok" ? "" : "budget-hot"}>{used}% used</strong>
            </div>
            <div className="budget-track" aria-hidden>
              <span className={`budget-fill budget-${tone}`} style={{ width: `${Math.min(used, 100)}%` }} />
              <span className="budget-marker" style={{ left: `${marker}%` }} />
            </div>
          </div>
        );
      })}
      <p className="hint">
        {admin ? "You see every ministry. Each minister sees only their own. " : "You see the ministries you lead. "}
        The line marks {marker}%, how far we are through the year.{sample ? " Numbers are sample figures until BILL is connected." : ""}
      </p>
    </section>
  );
}

export function StaffCardSpend({
  card,
  transactions,
  sample = true,
}: {
  card: CardMonth;
  transactions: CardTransaction[];
  sample?: boolean;
}) {
  const used = card.limit > 0 ? Math.min(100, Math.round((card.spent / card.limit) * 100)) : 0;
  const remaining = Math.max(0, card.limit - card.spent);
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={CreditCard}>My card this month</Heading>
        {sample ? <span className="sample-chip">Sample</span> : null}
      </div>
      <p className="budget-label"><span>{money(card.spent)} spent</span><strong>{money(remaining)} left</strong></p>
      <div className="budget-track" aria-hidden>
        <span className="budget-fill budget-ok" style={{ width: `${used}%` }} />
      </div>
      <p className="hint">Limit {money(card.limit)}. Recent charges:</p>
      {transactions.slice(0, 4).map((row) => (
        <article key={row.id} className="item">
          <div>
            <h3>{row.merchant}</h3>
            <p className="meta">
              <span>{row.date}</span>
              <span>{money(row.amount)}</span>
              {row.receiptMissing ? <span className="chip chip-overdue">Receipt missing</span> : null}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
