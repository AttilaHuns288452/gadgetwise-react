import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GW, money } from "../lib.js";
import { displayName } from "../components/ui.jsx";

const TABS = [
  ["overview", "OVERVIEW", [["dashboard", "Dashboard"], ["reports", "Reports"]]],
  ["catalog", "CATALOG", [["gadgets", "Gadgets"], ["categories", "Categories"]]],
  ["community", "COMMUNITY", [["reviews", "Reviews"]]],
  ["people", "PEOPLE", [["users", "Users"]]],
];

const TAB_TITLES = {
  dashboard: ["Dashboard", "Live overview of the catalog and moderation queues."],
  reports: ["Reports", "Catalog traffic, comparison activity, and recommendation engine output."],
  gadgets: ["Gadgets", "Catalog records the recommendation engine and comparison tool rely on."],
  categories: ["Categories", "The six gadget families used for browsing, filtering, and recommendation pools."],
  reviews: ["Review Moderation", "Approve reviews that reflect genuine student experience; reject spam, secondhand reports, or abuse."],
  users: ["Users", "Registered student accounts."],
};

const initials = (name) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

function StatCard({ label, value, note }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink3">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {note && <div className="mt-1 text-sm text-ink3">{note}</div>}
    </div>
  );
}

function Panel({ title, note, action, children }) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {note && <p className="mt-1 text-sm text-ink3">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RankList({ rows }) {
  return (
    <ol className="divide-y divide-line">
      {rows.map(([id, n], i) => {
        const g = GW.getGadget(id);
        return (
          <li key={id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="mono w-5 shrink-0 text-xs text-ink3">{i + 1}</span>
              {g ? <Link to={`/g/${g.id}`} className="truncate font-medium hover:text-primary">{displayName(g)}</Link>
                 : <span className="truncate">{id}</span>}
            </span>
            <span className="mono shrink-0 text-ink2">{n.toLocaleString()}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Bars({ rows, suffix = "" }) {
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <ol className="space-y-2.5">
      {rows.map(([label, n]) => (
        <li key={label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span>{label}</span>
            <span className="mono text-ink2">{n.toLocaleString()}{suffix}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface2">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function StatusChip({ status }) {
  const tone = {
    active: "bg-green-50 text-green-700", published: "bg-green-50 text-green-700", approved: "bg-green-50 text-green-700",
    pending: "bg-amber-50 text-amber-700", inactive: "bg-surface2 text-ink2",
    suspended: "bg-red-50 text-red-700", rejected: "bg-red-50 text-red-700",
  }[status] || "bg-surface2 text-ink2";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{status}</span>;
}

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "dashboard";
  const [title, subtitle] = TAB_TITLES[tab] || TAB_TITLES.dashboard;

  const moderation = useMemo(() => GW.admin.moderation.map((r) => ({ ...r })), []);
  const [rows, setRows] = useState(moderation);
  const [modFilter, setModFilter] = useState("all");
  const [gadgetQuery, setGadgetQuery] = useState("");
  const [gadgetCat, setGadgetCat] = useState("all");
  const [userQuery, setUserQuery] = useState("");

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const setGadgets = new Set(GW.gadgets.map((g) => g.id));

  const modRows = rows.filter((r) => modFilter === "all" || r.status === modFilter);
  const gadgetRows = GW.gadgets.filter((g) =>
    (gadgetCat === "all" || g.category === gadgetCat) &&
    (displayName(g).toLowerCase().includes(gadgetQuery.toLowerCase()) || g.id.includes(gadgetQuery.toLowerCase()))
  );
  const userRows = GW.users.filter((u) =>
    u.name.toLowerCase().includes(userQuery.toLowerCase()) || u.email.includes(userQuery.toLowerCase())
  );

  const setStatus = (id, status) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <div className="mx-auto max-w-[1904px] px-6 lg:px-12 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-warm">GadgetWise · Staff console</div>
          <h1 className="mt-1 text-[2.25rem] lg:text-[2.75rem]">{title}</h1>
          <p className="mt-2 max-w-2xl text-ink2">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setParams({ tab: "reviews" })}
            className="rounded-sm border border-line px-4 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary">
            Moderation queue{pendingCount > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{pendingCount} pending</span>}
          </button>
          <button type="button" onClick={() => setParams({ tab: "gadgets" })} className="btn-primary !py-2.5">+ Add gadget</button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start" aria-label="Admin">
          <ol className="flex gap-1 overflow-x-auto pb-2 lg:block lg:space-y-5 lg:overflow-visible lg:pb-0">
            {TABS.map(([section, label, items]) => (
              <li key={section}>
                <div className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-ink3 lg:block">{label}</div>
                <ol className="flex gap-1 lg:mt-1.5 lg:block lg:space-y-0.5">
                  {items.map(([key, text]) => (
                    <li key={key}>
                      <button type="button" onClick={() => setParams({ tab: key })}
                        className={`w-full whitespace-nowrap rounded-sm px-3 py-1.5 text-left text-sm font-medium ${tab === key ? "bg-primary-soft text-primary-dark" : "text-ink2 hover:text-primary"}`}>
                        {text}
                      </button>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
            <li className="hidden lg:block">
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-ink3">Session</div>
              <ol className="mt-1.5 space-y-0.5">
                <li><Link to="/" className="block rounded-sm px-3 py-1.5 text-sm font-medium text-ink2 hover:text-primary">View public site</Link></li>
              </ol>
            </li>
          </ol>
        </nav>

        <div className="min-w-0 space-y-6">
          {tab === "dashboard" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total users" value={GW.users.length} note="registered accounts" />
                <StatCard label="Gadgets listed" value={GW.gadgets.length} note={`${GW.categories.length} categories`} />
                <StatCard label="Pending reviews" value={pendingCount} note="needs moderation" />
                <StatCard label="Total reviews" value={rows.length} note="approved + pending" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Top viewed this month" note="Detail-page views, trailing 30 days">
                  <RankList rows={GW.admin.topViewed.slice(0, 5)} />
                </Panel>
                <Panel title="Moderation queue preview" action={
                  <button type="button" onClick={() => setParams({ tab: "reviews" })}
                    className="rounded-sm border border-line px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary">
                    Open moderation queue
                  </button>
                }>
                  <ul className="divide-y divide-line">
                    {rows.filter((r) => r.status === "pending").slice(0, 3).map((r) => (
                      <li key={r.id} className="py-2.5 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{r.gadget} · {r.rating}★</span>
                          <span className="mono text-xs text-ink3">{r.date}</span>
                        </div>
                        <div className="text-ink2">{r.user}</div>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
              <p className="text-xs text-ink3">Figures come from the catalog dataset plus admin edits stored in this prototype session.</p>
            </>
          )}

          {tab === "reports" && (
            <>
              <div className="grid gap-6 lg:grid-cols-3">
                <Panel title="Most viewed gadgets" note="Detail-page views this month"><RankList rows={GW.admin.topViewed} /></Panel>
                <Panel title="Most compared gadgets" note="Appearances in comparison sessions"><RankList rows={GW.admin.mostCompared} /></Panel>
                <Panel title="Most recommended" note="Top-3 appearances from the scoring engine"><RankList rows={GW.admin.mostRecommended} /></Panel>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Views by category" note="Share of total catalog views">
                  <Bars rows={GW.admin.viewsByCategory} suffix="%" />
                </Panel>
                <Panel title="Weekly page views" note="All pages, trailing 8 weeks">
                  <Bars rows={GW.admin.weeklyViews.map((n, i) => [`Week ${i + 1}`, n])} />
                </Panel>
              </div>
            </>
          )}

          {tab === "gadgets" && (
            <Panel title="Catalog" note="Search, filter, and manage gadget records."
              action={<button type="button" className="btn-primary !py-2">+ Add gadget</button>}>
              <div className="flex flex-wrap gap-3">
                <input type="search" value={gadgetQuery} onChange={(e) => setGadgetQuery(e.target.value)}
                  placeholder="Search brand or model…" aria-label="Search gadgets" className="field max-w-[20rem] flex-1" />
                <select value={gadgetCat} onChange={(e) => setGadgetCat(e.target.value)} className="field !w-auto" aria-label="Category filter">
                  <option value="all">All categories</option>
                  {GW.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="field !w-auto" aria-label="Status filter" defaultValue="all">
                  <option value="all">All statuses</option>
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-[0.1em] text-ink3">
                      <th className="py-2 pr-4">Gadget</th><th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Price</th><th className="py-2 pr-4">Rating</th>
                      <th className="py-2 pr-4">Status</th><th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gadgetRows.map((g) => (
                      <tr key={g.id} className="border-b border-line">
                        <td className="py-3 pr-4">
                          <Link to={`/g/${g.id}`} className="font-medium hover:text-primary">{displayName(g)}</Link>
                          <div className="mono text-xs text-ink3">{g.id}</div>
                        </td>
                        <td className="py-3 pr-4">{GW.getCategory(g.category)?.name}</td>
                        <td className="mono py-3 pr-4">{money(g.price)}</td>
                        <td className="mono py-3 pr-4">{g.rating}★</td>
                        <td className="py-3 pr-4"><StatusChip status="published" /></td>
                        <td className="py-3">
                          <span className="flex gap-2">
                            <button type="button" className="rounded-sm border border-line px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary">Edit</button>
                            <button type="button" className="rounded-sm border border-line px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary">Unpublish</button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {gadgetRows.length === 0 && <p className="py-6 text-sm text-ink3">No gadgets match this filter.</p>}
              </div>
            </Panel>
          )}

          {tab === "categories" && (
            <Panel title="Categories" action={<button type="button" className="btn-primary !py-2">+ Add category</button>}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {GW.categories.map((c) => {
                  const list = GW.gadgetsInCategory(c.id);
                  const avg = list.length ? (list.reduce((n, g) => n + g.rating, 0) / list.length).toFixed(1) : "—";
                  return (
                    <div key={c.id} className="rounded-sm border border-line p-4">
                      <h3 className="font-bold">{c.name}</h3>
                      <div className="mt-1 text-sm text-ink2">{list.length} gadgets · avg {avg}★</div>
                      <p className="mt-2 text-sm text-ink3">{c.blurb || c.description}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {tab === "reviews" && (
            <Panel title="Moderation queue" note={`${pendingCount} pending`}>
              <div className="flex flex-wrap gap-1">
                {["all", "pending", "approved", "rejected"].map((f) => (
                  <button key={f} type="button" onClick={() => setModFilter(f)}
                    className={`rounded-sm px-3 py-1.5 text-sm font-medium capitalize ${modFilter === f ? "bg-primary-soft text-primary-dark" : "text-ink2 hover:text-primary"}`}>
                    {f}
                  </button>
                ))}
              </div>
              <ul className="mt-4 divide-y divide-line">
                {modRows.map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{r.gadget} · {r.rating}★</span>
                      <span className="text-xs text-ink3">{r.user} · {r.date}</span>
                    </div>
                    <p className="mt-1.5 max-w-3xl text-sm text-ink2">“{r.text}”</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusChip status={r.status} />
                      {r.status !== "approved" && (
                        <button type="button" onClick={() => setStatus(r.id, "approved")}
                          className="rounded-sm border border-line px-2.5 py-1 text-xs font-medium hover:border-green-600 hover:text-green-700">Approve</button>
                      )}
                      {r.status !== "rejected" && (
                        <button type="button" onClick={() => setStatus(r.id, "rejected")}
                          className="rounded-sm border border-line px-2.5 py-1 text-xs font-medium hover:border-red-600 hover:text-red-700">Reject</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {modRows.length === 0 && <p className="py-6 text-sm text-ink3">Nothing in this bucket.</p>}
            </Panel>
          )}

          {tab === "users" && (
            <Panel title="Users">
              <input type="search" value={userQuery} onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search name or email…" aria-label="Search users" className="field max-w-[20rem]" />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-[0.1em] text-ink3">
                      <th className="py-2 pr-4">User</th><th className="py-2 pr-4">Registered</th>
                      <th className="py-2 pr-4">Status</th><th className="py-2">Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRows.map((u) => (
                      <tr key={u.email} className="border-b border-line">
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-dark">{initials(u.name)}</span>
                            <span>
                              <span className="block font-medium">{u.name}</span>
                              <span className="block text-xs text-ink3">{u.email}</span>
                            </span>
                          </span>
                        </td>
                        <td className="mono py-3 pr-4 text-ink2">{u.registered}</td>
                        <td className="py-3 pr-4"><StatusChip status={u.status} /></td>
                        <td className="mono py-3">{u.reviews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {userRows.length === 0 && <p className="py-6 text-sm text-ink3">No users match this search.</p>}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
