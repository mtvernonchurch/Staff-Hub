import Link from "next/link";
import { CreditCard, Wallet } from "lucide-react";
import { Heading } from "@/components/heading";
import { MinistryBudgetCard } from "@/components/budget-card";
import { Flash, PageHeader } from "@/components/ui";
import { money, monthKey, yearProgress } from "@/lib/budgets/access";
import { loadBudgetView } from "@/lib/budgets/view";
import { isAdmin } from "@/lib/domain/access";
import { chicagoToday } from "@/lib/domain/dates";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Budgets" };

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const month = /^\d{4}-\d{2}$/.test(query.month ?? "") ? query.month! : monthKey(today);
  const view = await loadBudgetView(staff, store, month);
  const admin = isAdmin(staff);

  return (
    <>
      <PageHeader
        kicker="Sample until BILL is connected"
        icon={Wallet}
        title="Budgets"
        lede="Ministry totals and staff cards. You only see amounts you are allowed to see."
      />
      <Flash error={query.error ?? (view.ok ? undefined : view.message)} notice={query.notice} />
      {view.ok ? (
        <>
          <MinistryBudgetCard rows={view.ministries} today={today} sample={view.sample} admin={admin} />
          <section className="card" style={{ marginTop: 16 }}>
            <Heading icon={Wallet}>Ministry detail</Heading>
            {view.ministries.map((row) => {
              const remaining = row.annual - row.spent;
              const max = Math.max(...row.monthly, 1);
              return (
                <article key={row.ministry} className="item">
                  <div>
                    <h3>{row.ministry}</h3>
                    <p className="meta">
                      <span>Budget {money(row.annual)}</span>
                      <span>Spent {money(row.spent)}</span>
                      <span>{remaining >= 0 ? `${money(remaining)} left` : `${money(Math.abs(remaining))} over`}</span>
                    </p>
                    {row.monthly.length > 0 ? (
                      <div className="trend" aria-label="Monthly spend">
                        {row.monthly.map((amount, index) => (
                          <span key={`${row.ministry}-${index}`} style={{ height: `${Math.max(8, (amount / max) * 48)}px` }} title={money(amount)} />
                        ))}
                      </div>
                    ) : <p className="hint">No monthly trend on this row.</p>}
                  </div>
                </article>
              );
            })}
          </section>
          {admin ? (
            <section className="card" style={{ marginTop: 16 }}>
              <div className="card-head">
                <Heading icon={CreditCard}>Staff cards</Heading>
                <MonthLinks month={month} />
              </div>
              <p className="hint">
                {view.cards.length} cards · spent {money(view.cards.reduce((sum, card) => sum + card.spent, 0))} of {money(view.cards.reduce((sum, card) => sum + card.limit, 0))}
                {" · "}year marker {Math.round(yearProgress(today) * 100)}%
              </p>
              {view.cards.map((card) => {
                const used = card.limit > 0 ? Math.round((card.spent / card.limit) * 100) : 0;
                const txns = view.transactions.filter((row) => row.staff === card.staff);
                return (
                  <article key={card.staff} className="item">
                    <div>
                      <h3>{card.staff}</h3>
                      <p className="meta">
                        <span>{used}% used</span>
                        <span>{money(card.spent)} of {money(card.limit)}</span>
                        <span>{money(Math.max(0, card.limit - card.spent))} left</span>
                      </p>
                      {txns.map((row) => (
                        <p key={row.id} className="note">{row.date} · {row.merchant} · {money(row.amount)}{row.receiptMissing ? " · receipt missing" : ""}</p>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
          ) : view.cards[0] ? (
            <p className="hint" style={{ marginTop: 12 }}><Link href="/">Your card is on Home.</Link></p>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function MonthLinks({ month }: { month: string }) {
  const [year, raw] = month.split("-").map(Number);
  const prev = shift(year, raw, -1);
  const next = shift(year, raw, 1);
  return (
    <span className="row-actions">
      <Link href={`/budgets?month=${prev}`}>{prev}</Link>
      <strong>{month}</strong>
      <Link href={`/budgets?month=${next}`}>{next}</Link>
    </span>
  );
}

function shift(year: number, month: number, delta: number): string {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
