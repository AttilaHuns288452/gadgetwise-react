import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GW, money } from "../lib.js";
import { useAuth } from "../lib/auth.js";
import { supabase, supabaseConfigured } from "../lib/supabase.js";
import { Modal, useToast, btnPrimaryCls, btnOutlineCls, btnDangerCls, fieldLabelCls, fieldInputCls, displayName } from "../components/ui.jsx";

const ICONS = {
  dashboard: "M4 4h6v6H4zM14 4h6v10h-6zM4 14h6v6H4zM14 18h6v2h-6z",
  reports: "M4 20V6M10 20V10M16 20V4M4 20h16",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12L4 7.5M12 12v9",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  chat: "M4 5h16v10H8l-4 4z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.3 3.6-5 8-5s8 1.7 8 5",
  home: "M3 11l9-7 9 7M5 10v10h14V10",
  exit: "M9 5H5v14h4M15 8l4 4-4 4M19 12H9",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  pencil: "M4 20l4-1L20 7l-3-3L5 16zM14 6l3 3",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5",
  refresh: "M20 12a8 8 0 10-2.5 5.8M20 12V7m0 5h-5",
  plus: "M12 5v14M5 12h14",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12L4 7.5M12 12v9",
  star: "M12 3l2.6 6 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.2 1.4-6.3L3 9.6 9.4 9z",
  trendUp: "m3 17 6-6 4 4 8-8M15 7h6v6",
};

function Ico({ n, size = 18, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={ICONS[n]} />
    </svg>
  );
}

const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#2260D4] px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-[#1b4fb3]";
const btnSecondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-4 py-2.5 text-[15px] font-semibold text-[#2260D4] hover:bg-[#F5F8FF]";
const btnOutline = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-4 py-2.5 text-[15px] font-semibold text-[#344054] hover:bg-[#F4F5F7]";
const iconBtn = "inline-flex items-center justify-center rounded-md border border-[#E4E7EC] bg-white p-2 text-[#667085] hover:border-[#2260D4] hover:text-[#2260D4]";
const inputCls = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3.5 py-2.5 text-[15px] text-[#101828] placeholder:text-[#98A2B3] focus:border-[#2260D4] focus:outline-none";
const labelCls = "block text-[13px] font-semibold text-[#344054]";
const cellCls = "px-4 py-3.5 align-middle text-[15px] text-[#344054]";
const headCls = "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475467]";

function Pill({ kind, children }) {
  const styles = {
    published: "bg-[#E7F7EF] text-[#127A4B]",
    approved: "bg-[#E7F7EF] text-[#127A4B]",
    pending: "bg-[#FCF3E4] text-[#8A6520]",
    active: "bg-[#E7F7EF] text-[#127A4B]",
    inactive: "bg-[#EAECF0] text-[#475467]",
    suspended: "bg-[#FCEBE6] text-[#B42318]",
    rejected: "bg-[#EAECF0] text-[#475467]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${styles[kind] || styles.inactive}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`w-full min-w-0 rounded-xl border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold text-[#111827]">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BarList({ rows }) {
  const max = Math.max(...rows.map(([, v]) => v));
  return (
    <ul className="space-y-3.5">
      {rows.map(([name, value]) => (
        <li key={name} className="flex items-center gap-4">
          <span className="w-28 shrink-0 truncate text-[15px] text-[#344054] sm:w-72">{name}</span>
          <span className="h-3 flex-1 overflow-hidden rounded bg-[#EDEFF3]">
            <span className="block h-full rounded bg-[#CBD5E1]" style={{ width: `${(value / max) * 100}%` }} />
          </span>
          <span className="w-16 shrink-0 text-right text-[15px] font-semibold text-[#111827]">{value.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

function StatCard({ label, value, trend, tone }) {
  const amber = tone === "amber";
  return (
    <div className={`rounded-xl border bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)] ${amber ? "border-2 border-[#B07C28]" : "border-[#E4E7EC]"}`}>
      <div className="text-[13px] text-[#667085]">{label}</div>
      <div className={`mt-1 text-[40px] font-bold leading-none ${amber ? "text-[#7C4708]" : "text-[#111827]"}`}>{value}</div>
      <div className={`mt-3 flex items-center gap-1.5 text-[13px] font-semibold ${trend.down ? "text-[#C0392B]" : "text-[#12B76A]"}`}>
        <Ico n="trendUp" size={15} /> {trend.text}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className={labelCls}>
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const toCat = (c) => ({ id: c.id, name: c.name, desc: c.blurb });

function Dashboard({ tab }) {
  const pending = GW.admin.moderation.filter((r) => r.status === "pending").length;
  const stats = [
    ["Total users", GW.users.length, { text: "registered accounts" }, {}],
    ["Gadgets listed", GW.gadgets.length, { text: "6 categories" }, {}],
    ["Pending reviews", pending, { text: "needs moderation", down: true }, { tone: "amber" }],
    ["Total reviews", GW.admin.moderation.length, { text: "approved + pending" }, {}],
  ];
  const preview = GW.admin.moderation.filter((r) => r.status === "pending").slice(0, 4);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Dashboard</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">Live overview of the catalog and moderation queues.</p>
        </div>
        <div className="flex gap-3">
          <button className={btnSecondary} onClick={() => tab("reviews")}>Moderation queue</button>
          <button className={btnPrimary} onClick={() => tab("add")}><Ico n="plus" size={16} /> Add gadget</button>
        </div>
      </div>
      <hr className="mt-6 border-[#EAECF0]" />

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(([label, value, trend, opts]) => (
          <StatCard key={label} label={label} value={value} trend={trend} {...opts} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[52fr_44fr]">
        <Panel title="Top viewed this month" action={<button className="text-[14px] font-semibold text-[#2260D4] hover:underline" onClick={() => tab("reports")}>Full reports →</button>}>
          <BarList rows={GW.admin.topViewed.slice(0, 5).map(([id, v]) => [displayName(GW.getGadget(id)), v])} />
        </Panel>
        <Panel title="Moderation queue preview">
          <ul className="space-y-3">
            {preview.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#D9A441]" />
                <span className="min-w-0 flex-1 truncate text-[15px] text-[#111827]">{r.gadget} · {r.rating}★</span>
                <span className="shrink-0 text-[13px] text-[#6B7280]">{r.user} · {r.date}</span>
              </li>
            ))}
          </ul>
          <button className={`${btnOutline} mt-5 w-full`} onClick={() => tab("reviews")}>Open moderation queue</button>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Popular categories">
          <p className="text-[15px] leading-relaxed text-[#4B5563]">
            Smartphones and laptops draw 65% of catalog views — keep their specs and issues freshest.
          </p>
        </Panel>
        <Panel title="Data status">
          <p className="text-[15px] leading-relaxed text-[#4B5563]">
            Figures come from the catalog dataset plus admin edits stored in this browser.
          </p>
        </Panel>
      </div>
    </>
  );
}

function Reports() {
  const [dt, setDt] = useState(null);
  const gname = (id) => displayName(GW.getGadget(id));
  const panels = [
    ["viewed", "Most viewed", "Top product detail pages by view count.", GW.admin.topViewed, 8],
    ["compared", "Most compared", "Products most often placed side by side.", GW.admin.mostCompared, 6],
    ["recommended", "Most recommended", "Most frequent results of the quiz and category flows.", GW.admin.mostRecommended, 6],
  ];
  const legendColors = ["#2260D4", "#5B8DEF", "#97B5EE", "#C7D8F6", "#E3A62F", "#1B2A4B"];
  const max = Math.max(...GW.admin.weeklyViews);
  const min = Math.min(...GW.admin.weeklyViews);
  const pts = GW.admin.weeklyViews.map((v, i) => [40 + i * 80, 180 - ((v - min) / (max - min)) * 140]);
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <>
      <h1 className="text-[30px] font-bold text-[#111827]">Reports</h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">Internal analytics — content performance and catalog trends.</p>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {panels.map(([id, title, sub, rows, count]) => (
          <Panel key={id} title={title} action={
            <button className="text-[13px] font-semibold text-[#2260D4] hover:underline" onClick={() => setDt(dt === id ? null : id)}>
              {dt === id ? "Hide data table" : "View data table"}
            </button>
          }>
            <p className="text-[13px] text-[#667085]">{sub}</p>
            {dt === id ? (
              <table className="mt-4 w-full text-[13px]">
                <thead><tr className="border-b border-[#EAECF0]"><th className={headCls}>Product</th><th className={headCls}>Views</th></tr></thead>
                <tbody>
                  {rows.slice(0, count).map(([sid, v]) => (
                    <tr key={sid} className="border-b border-[#F2F4F7]"><td className={cellCls}>{gname(sid)}</td><td className={cellCls}>{v.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="mt-4"><BarList rows={rows.slice(0, count).map(([sid, v]) => [gname(sid), v])} /></div>
            )}
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Views by category" action={
          <button className="text-[13px] font-semibold text-[#2260D4] hover:underline" onClick={() => setDt(dt === "cats" ? null : "cats")}>
            {dt === "cats" ? "Hide data table" : "View data table"}
          </button>
        }>
          <p className="text-[13px] text-[#667085]">Share of product page views in the last 30 days.</p>
          {dt === "cats" ? (
            <table className="mt-4 w-full text-[13px]">
              <thead><tr className="border-b border-[#EAECF0]"><th className={headCls}>Category</th><th className={headCls}>Share</th></tr></thead>
              <tbody>
                {GW.admin.viewsByCategory.map(([name, pct]) => (
                  <tr key={name} className="border-b border-[#F2F4F7]"><td className={cellCls}>{name}</td><td className={cellCls}>{pct}%</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-8">
              <div className="h-44 w-44 shrink-0 rounded-full" style={{
                background: `conic-gradient(${GW.admin.viewsByCategory.map(([name, pct], i) =>
                  `${legendColors[i]} ${GW.admin.viewsByCategory.slice(0, i).reduce((s, [, p]) => s + p, 0)}% ${GW.admin.viewsByCategory.slice(0, i + 1).reduce((s, [, p]) => s + p, 0)}%`
                ).join(",")})`,
              }} />
              <ul className="space-y-2">
                {GW.admin.viewsByCategory.map(([name, pct], i) => (
                  <li key={name} className="flex items-center gap-2.5 text-[14px] text-[#344054]">
                    <span className="h-3 w-3 rounded-full" style={{ background: legendColors[i] }} />
                    <span className="w-28">{name}</span>
                    <span className="font-semibold text-[#111827]">{pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Weekly page views" action={
          <button className="text-[13px] font-semibold text-[#2260D4] hover:underline" onClick={() => setDt(dt === "week" ? null : "week")}>
            {dt === "week" ? "Hide data table" : "View data table"}
          </button>
        }>
          <p className="text-[13px] text-[#667085]">Total product page views across all categories.</p>
          {dt === "week" ? (
            <table className="mt-4 w-full text-[13px]">
              <thead><tr className="border-b border-[#EAECF0]"><th className={headCls}>Week</th><th className={headCls}>Views</th></tr></thead>
              <tbody>
                {GW.admin.weeklyViews.map((v, i) => (
                  <tr key={i} className="border-b border-[#F2F4F7]"><td className={cellCls}>Week {i + 1}</td><td className={cellCls}>{v.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <svg viewBox="0 0 640 220" className="mt-5 w-full">
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line x1="40" x2="620" y1={40 + i * 35} y2={40 + i * 35} stroke="#EAECF0" />
                  <text x="0" y={44 + i * 35} fontSize="12" fill="#98A2B3">{Math.round((max - ((max - min) / 4) * i) / 100) / 10}k</text>
                </g>
              ))}
              <polyline points={line} fill="none" stroke="#2260D4" strokeWidth="2.5" />
              {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#2260D4" />)}
              {["Jul 20", "Aug 3", "Aug 17", "Aug 31"].map((m, i) => (
                <text key={m} x={40 + i * 160} y="210" fontSize="12" fill="#98A2B3">{m}</text>
              ))}
            </svg>
          )}
        </Panel>
      </div>
      <p className="mt-6 text-[13px] text-[#6B7280]">
        Analytics figures are generated for the prototype dataset. Production reporting will use real page and comparison events.
      </p>
    </>
  );
}

function Gadgets({ tab, rows, setRows, editIn, toast, categories }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [del, setDel] = useState(null);
  const cats = [...new Set(rows.map((g) => g.category))];
  const filtered = rows.filter((g) =>
    (cat === "all" || g.category === cat) &&
    (statusFilter === "all" || g.status === statusFilter) &&
    `${g.brand} ${g.model}`.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Gadgets</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">Catalog records the recommendation engine and comparison tool rely on.</p>
        </div>
        <button className={btnPrimary} onClick={() => tab("add")}><Ico n="plus" size={16} /> Add gadget</button>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <input className={`${inputCls} !w-72`} placeholder="Search brand or model..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} !w-52`} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className={`${inputCls} !w-44`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft / unpublished</option>
        </select>
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-[#EAECF0]">
              <th className={headCls}>Gadget</th><th className={headCls}>Category</th><th className={headCls}>Price</th>
              <th className={headCls}>Rating</th><th className={headCls}>Status</th><th className={`${headCls} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} className="border-b border-[#F2F4F7] last:border-0">
                <td className={cellCls}>
                  <div className="flex items-center gap-3">
                    <img src={g.img} alt="" className="h-11 w-11 shrink-0 rounded-md border border-[#E4E7EC] bg-white object-contain p-0.5" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#111827]">{displayName(g)}</div>
                      <div className="truncate text-[13px] text-[#6B7280]">{g.id}</div>
                    </div>
                  </div>
                </td>
                <td className={cellCls}>{g.category}</td>
                <td className={`${cellCls} font-semibold text-[#111827]`}>{money(g.price)}</td>
                <td className={cellCls}>{g.rating}★</td>
                <td className={cellCls}><span className={g.status === "published" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"}>{g.status}</span></td>
                <td className={cellCls}>
                  <div className="flex justify-end gap-2">
                    <Link to={`/g/${g.id}`} className={iconBtn} title="View public page"><Ico n="eye" /></Link>
                    <button
                      className="rounded-md border border-[#D9DEE7] px-2 py-1 text-xs font-semibold text-[#344054] hover:bg-[#F5F8FF]"
                      title={g.status === "published" ? "Unpublish gadget" : "Publish gadget"}
                      onClick={async () => {
                        const publishing = g.status !== "published";
                        if (publishing) {
                          const requiredScores = ["performance", "battery", "durability", "portability", "display", "camera", "storage", "repairability"];
                          const selectedCategory = (categories || []).find((category) => category.id === g.category);
                          if (!selectedCategory || !selectedCategory.is_published) {
                            toast("Publish this gadget's category first.", "alert");
                            return;
                          }
                          if (!/^https?:\/\//i.test(g.source_url || "")) {
                            toast("Add a valid HTTP(S) source URL before publishing.", "alert");
                            return;
                          }
                          if (requiredScores.some((key) => !Number.isFinite(Number(g.scored?.[key])) || Number(g.scored[key]) < 0 || Number(g.scored[key]) > 10)) {
                            toast("Edit this gadget and complete all eight scoring fields before publishing.", "alert");
                            return;
                          }
                        }
                        const nextRows = rows.map((row) => row.id === g.id
                          ? {
                              ...row,
                              status: publishing ? "published" : "draft",
                              data_source: publishing ? "admin_verified" : (row.data_source || "admin_entered_unverified"),
                              price_verified_at: publishing ? new Date().toISOString() : null,
                            }
                          : row);
                        const saved = await setRows(nextRows);
                        if (saved) toast(publishing ? "Gadget published." : "Gadget unpublished.");
                      }}
                    >{g.status === "published" ? "Unpublish" : "Publish"}</button>
                    <button className={iconBtn} title="Edit" onClick={() => editIn(g)}><Ico n="pencil" /></button>
                    <button className={iconBtn} title="Delete" onClick={() => setDel(g)}><Ico n="trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className={`${cellCls} text-[#6B7280]`} colSpan={6}>No gadgets match the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {del && (
        <Modal
          title="Delete gadget"
          sub="Removes the record from the catalog — public pages, comparisons, and the recommender stop showing it."
          onClose={() => setDel(null)}
          actions={<>
            <button className={btnOutlineCls} onClick={() => setDel(null)}>Cancel</button>
            <button className={btnDangerCls} onClick={async () => {
              const saved = await setRows(rows.filter((r) => r.id !== del.id));
              if (saved) { setDel(null); toast("Gadget deleted", "trash"); }
            }}>Delete</button>
          </>}
        >
          <p className="text-[17px] text-[#111827]">Remove <b>{displayName(del)}</b> from the catalog?</p>
        </Modal>
      )}
    </>
  );
}

function AddGadget({ tab, onSave, editing, toast, categories }) {
  const form = useRef(null);
  const [specs, setSpecs] = useState(() => Object.keys(editing?.specs || {}).length ? Object.keys(editing.specs) : ["Weight", "Ports"]);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");

  async function searchLazada(event) {
    event.preventDefault();
    const query = lookupQuery.trim();
    if (query.length < 2 || query.length > 120) {
      setLookupError("Enter a search between 2 and 120 characters.");
      return;
    }
    setLookupBusy(true);
    setLookupError("");
    try {
      const response = await fetch("/api/lazada/search?q=" + encodeURIComponent(query) + "&marketplace=ph&page=1", {
        headers: { Accept: "application/json" },
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("The product-search endpoint did not return JSON. It may not be deployed on this host.");
      }
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || "Product search is unavailable right now.");
      }
      const results = Array.isArray(data?.products) ? data.products.filter((item) => item && typeof item.title === "string" && item.title.trim()) : [];
      setLookupResults(results);
      if (results.length === 0) setLookupError("No listings were returned. Try another query or check the Lazada API configuration.");
    } catch (error) {
      setLookupResults([]);
      setLookupError(error instanceof Error ? error.message : "Product search could not be reached.");
    } finally {
      setLookupBusy(false);
    }
  }

  function fillFromListing(product) {
    const f = form.current;
    if (!f) return;
    const safeUrl = (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
      } catch {
        return "";
      }
    };
    f.brand.value = product.brandName || "";
    f.model.value = product.title || "";
    f.price.value = product.price != null && Number.isFinite(Number(product.price)) ? String(product.price) : "";
    f.img.value = safeUrl(product.imageUrl || "");
    f.source_url.value = safeUrl(product.productUrl || "");
    setLookupError("");
    toast("Listing copied into the form. Verify the source, category, price, and scoring before publishing.", "info");
    f.category.focus();
  }

  return (
    <>
      <button className="text-[13px] font-semibold text-[#2260D4] hover:underline" onClick={() => tab("gadgets")}>← Back to list</button>
      <h1 className="mt-3 text-[30px] font-bold text-[#111827]">{editing ? "Edit Gadget" : "Add Gadget"}</h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">Search current Lazada listings, import verified listing fields into a draft, then review and complete the catalog fields.</p>

      <section className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">Lazada product lookup</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-[#667085]">Searches the server-side /api/lazada/search endpoint. The API key stays on the server. Results can be cached and retailer listings can be inaccurate; selecting a result only pre-fills a draft and never writes to the catalog.</p>
          </div>
          <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-semibold text-[#2260D4]">Marketplace: Philippines</span>
        </div>
        <form onSubmit={searchLazada} className="mt-4 flex flex-wrap gap-2">
          <input
            value={lookupQuery}
            onChange={(event) => setLookupQuery(event.target.value)}
            maxLength={120}
            minLength={2}
            placeholder="Search e.g. Lenovo LOQ 15, Redmi Note 14…"
            aria-label="Search Lazada listings"
            className={inputCls + " min-w-[220px] flex-1"}
          />
          <button type="submit" disabled={lookupBusy} className={btnPrimaryCls + " disabled:opacity-60"}>
            {lookupBusy ? "Searching…" : "Search Lazada"}
          </button>
        </form>
        {lookupError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{lookupError}</p>}
        {lookupResults.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lookupResults.map((product, index) => (
              <article key={product.productId || product.productUrl || product.title + "-" + index} className="overflow-hidden rounded-lg border border-[#E4E7EC]">
                <div className="flex gap-3 p-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-md bg-[#F9FAFB] object-contain" />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-[#F9FAFB] text-xs text-[#667085]">No image</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold text-[#111827]">{product.title}</div>
                    <div className="mt-1 text-xs text-[#667085]">{product.brandName || product.sellerName || "Brand not provided"}</div>
                    <div className="mt-1 font-mono text-sm font-bold text-[#111827]">{product.price != null ? money(Number(product.price)) : "Price unavailable"}</div>
                    {product.rating != null && <div className="text-xs text-[#667085]">{product.rating}/5 · {product.reviewCount || 0} reviews</div>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[#E4E7EC] bg-[#FCFCFD] p-3">
                  {product.productUrl && /^https?:\/\//i.test(product.productUrl) ? (
                    <a href={product.productUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#2260D4] hover:underline">Open listing</a>
                  ) : <span className="text-xs text-[#667085]">No listing URL</span>}
                  <button type="button" onClick={() => fillFromListing(product)} className="rounded-md bg-[#1D4E8F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#163c72]">Use this listing</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-4 rounded-lg border border-[#F0D8A8] bg-[#FCF3E4] px-4 py-3 text-[13px] text-[#8A6520]">
        Search data is not a verified product specification sheet. Confirm the exact model, seller, price, and specifications. The listing’s source URL and price are recorded only when you save the form.
      </div>

      <form ref={form} className="mt-6 space-y-6" onSubmit={(e) => { e.preventDefault(); void onSave(new FormData(e.target)); }}>
        <Panel title="Core details">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Brand"><input name="brand" className={inputCls} placeholder="e.g. Kaido" defaultValue={editing?.brand || ""} /></Field>
            <Field label="Model"><input name="model" className={inputCls} placeholder="e.g. AirBook 14" defaultValue={editing?.model || ""} /></Field>
            <Field label="Category">
              <select name="category" className={inputCls} defaultValue={editing?.category || ""}>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Price (₱)"><input name="price" className={inputCls} placeholder="39999" defaultValue={editing?.price ?? ""} /></Field>
            <Field label="Release year"><input name="year" type="number" min="1990" max="2100" className={inputCls} placeholder="2026" defaultValue={editing?.year || ""} /></Field>
            <Field label="Image URL"><input name="img" type="url" className={inputCls} placeholder="https://…" defaultValue={editing?.img || ""} /></Field>
            <Field label="Source URL"><input name="source_url" type="url" className={inputCls} placeholder="https://manufacturer-or-retailer…" defaultValue={editing?.source_url || ""} /></Field>
            <Field label="Battery life (hours)"><input name="battery_hours" type="number" min="0" max="1000" step="0.1" className={inputCls} placeholder="8" defaultValue={editing?.battery ?? ""} /></Field>
          </div>
          <div className="mt-5">
            <Field label="Summary">
              <textarea name="summary" rows="3" className={inputCls} placeholder="A short description for product pages and search results." defaultValue={editing?.summary || ""} />
            </Field>
          </div>
        </Panel>

        <Panel title="Value & durability">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Warranty (years)"><input name="warranty" type="number" min="0" max="20" step="0.1" className={inputCls} placeholder="2" defaultValue={editing?.value?.warrantyYears ?? ""} /></Field>
            <Field label="Estimated lifespan (years)"><input name="lifespan" type="number" min="0" max="30" step="0.1" className={inputCls} placeholder="4.5" defaultValue={editing?.value?.lifespanYears ?? ""} /></Field>
            <Field label="Repairability (0–10)"><input name="repairability" type="number" min="0" max="10" step="0.1" className={inputCls} placeholder="5" defaultValue={editing?.scored?.repairability ?? ""} /></Field>
            <Field label="Durability (0–10)"><input name="durability" type="number" min="0" max="10" step="0.1" className={inputCls} placeholder="7.5" defaultValue={editing?.scored?.durability ?? ""} /></Field>
            <Field label="Repair path label"><input name="repair" className={inputCls} placeholder="Official repair path" defaultValue={editing?.value?.repairabilityLabel || ""} /></Field>
          </div>
        </Panel>

        <Panel title="Recommendation scoring inputs (0–10)">
          <p className="mb-4 text-sm text-[#667085]">Complete every score before publishing. Scores should reflect documented product evidence.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Performance"><input name="score_performance" type="number" min="0" max="10" step="0.1" className={inputCls} defaultValue={editing?.scored?.performance ?? ""} /></Field>
            <Field label="Battery score"><input name="score_battery" type="number" min="0" max="10" step="0.1" className={inputCls} defaultValue={editing?.scored?.battery ?? ""} /></Field>
            <Field label="Portability"><input name="score_portability" type="number" min="0" max="10" step="0.1" className={inputCls} defaultValue={editing?.scored?.portability ?? ""} /></Field>
            <Field label="Display"><input name="score_display" type="number" min="0" max="10" step="0.1" className={inputCls} defaultValue={editing?.scored?.display ?? ""} /></Field>
            <Field label="Camera"><input name="score_camera" type="number" min="0" max="10" step="0.1" className={inputCls} defaultValue={editing?.scored?.camera ?? ""} /></Field>
            <Field label="Storage"><input name="score_storage" type="number" min="0" max="10" step="0.1" className={inputCls} defaultValue={editing?.scored?.storage ?? ""} /></Field>
          </div>
        </Panel>

        <Panel title="Specifications">
          <div className="space-y-3">
            {specs.map((label, i) => (
              <div key={i} className="flex gap-3">
                <input name={"spec_key_" + i} className={`${inputCls} !w-56`} defaultValue={label} placeholder="Specification" />
                <input name={"spec_value_" + i} className={inputCls} placeholder="Value" defaultValue={editing?.specs?.[label] || ""} />
                <button type="button" className={iconBtn} title="Remove" onClick={() => setSpecs(specs.filter((_, j) => j !== i))}><Ico n="trash" /></button>
              </div>
            ))}
          </div>
          <button type="button" className={`${btnOutline} mt-4`} onClick={() => setSpecs([...specs, ""])}><Ico n="plus" size={16} /> Add specification row</button>
        </Panel>

        <label className="flex items-start gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={editing?.status === "published"} className="mt-1" />
          <span><strong className="block">Publish this gadget</strong><span className="text-[#667085]">Publishing requires an HTTP(S) source URL and all eight scores. Verify the source, price, and specifications first.</span></span>
        </label>

        <div className="flex gap-3">
          <button type="submit" className={btnPrimary}>Save gadget</button>
          <button type="button" className={btnOutline} onClick={() => tab("gadgets")}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function Categories({ rows, setRows, gadgets, toast }) {
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const counts = Object.fromEntries(
    rows.map((c) => {
      const inCat = gadgets.filter((g) => g.category === c.id);
      return [c.id, { n: inCat.length, avg: inCat.length ? (inCat.reduce((s, g) => s + g.rating, 0) / inCat.length).toFixed(1) : "0.0" }];
    })
  );
  const save = async () => {
    const name = form.name.trim();
    if (!name) { toast("Give the category a name", "alert"); return; }
    if (rows.some((r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== form.editing)) {
      toast("A category with that name already exists", "alert"); return;
    }
    const next = form.editing
      ? rows.map((r) => (r.id === form.editing ? { ...r, name, desc: form.desc } : r))
      : [...rows, { id: slugify(name), name, desc: form.desc, is_published: true }];
    const saved = await setRows(next);
    if (!saved) return;
    setForm(null);
    toast(form.editing ? "Category updated" : "Category added", form.editing ? "edit" : "checkCircle");
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Categories</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">Organization labels for the catalog.</p>
        </div>
        <button className={btnPrimary} onClick={() => setForm({ name: "", desc: "" })}><Ico n="plus" size={16} /> Add category</button>
      </div>

      {form && (
        <Modal
          title={form.editing ? "Edit category" : "Add category"}
          sub="Category names appear in browse filters, the recommender, and the admin console."
          onClose={() => setForm(null)}
          actions={<>
            <button className={btnOutlineCls} onClick={() => setForm(null)}>Cancel</button>
            <button className={btnPrimaryCls} onClick={save}>{form.editing ? "Save" : "Add"}</button>
          </>}
        >
          <div>
            <label className={fieldLabelCls} htmlFor="catName">Name</label>
            <input id="catName" className={fieldInputCls} placeholder="e.g., Cameras" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="catDesc">Description</label>
            <input id="catDesc" className={fieldInputCls} placeholder="One line on what belongs here." value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          </div>
        </Modal>
      )}

      {del && (() => {
        const n = counts[del.id]?.n ?? 0;
        return (
          <Modal
            title="Delete category"
            sub={n ? `It still holds ${n} gadgets — move them to another category first.` : "The category is empty and will be removed."}
            onClose={() => setDel(null)}
            actions={<>
              <button className={btnOutlineCls} onClick={() => setDel(null)}>Cancel</button>
              <button className={`${btnDangerCls} disabled:cursor-not-allowed disabled:bg-[#D0D5DD] disabled:text-[#667085]`} disabled={n > 0} onClick={async () => {
                const saved = await setRows(rows.filter((r) => r.id !== del.id));
                if (saved) { setDel(null); toast("Category deleted", "trash"); }
              }}>Delete</button>
            </>}
          >
            <p className="text-[17px] text-[#111827]">Delete <b>{del.name}</b>?</p>
          </Modal>
        );
      })()}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {rows.map((c) => {
          const s = counts[c.id] || { n: 0, avg: "0.0" };
          return (
            <div key={c.id} className="min-w-0 rounded-xl border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF3FC] text-[#2260D4]"><Ico n="cube" size={18} /></span>
                  <div>
                    <h3 className="text-[20px] font-bold text-[#111827]">{c.name}</h3>
                    <p className="text-[13px] text-[#667085]">{s.n} gadgets · avg {s.avg}★</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/gadgets" className={iconBtn} title="View catalog"><Ico n="eye" /></Link>
                  <button className={iconBtn} title="Edit" onClick={() => setForm({ name: c.name, desc: c.desc, editing: c.id })}><Ico n="pencil" /></button>
                  <button className={iconBtn} title="Delete" onClick={() => setDel(c)}><Ico n="trash" /></button>
                </div>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-[#4B5563]">{c.desc}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Reviews({ rows, setRows, toast }) {
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const pending = rows.filter((r) => r.status === "pending").length;
  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const setStatus = async (id, status) => {
    const saved = await setRows(rows.map((r) => (r.id === id ? { ...r, status } : r)));
    if (saved) toast(status === "approved" ? "Review approved and published" : "Review rejected and hidden",
      status === "approved" ? "checkCircle" : "x");
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[30px] font-bold text-[#111827]">Review Moderation</h1>
        <span className="rounded-full bg-[#FCF3E4] px-3 py-1 text-[13px] font-semibold text-[#8A6520]">{pending} pending</span>
      </div>
      <p className="mt-1 text-[15px] text-[#6B7280]">Approve, reject, edit, or delete community reviews before they appear on product pages.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-[14px] font-semibold capitalize ${filter === f ? "bg-[#2260D4] text-white" : "border border-[#D9DEE7] bg-white text-[#344054] hover:bg-[#F5F8FF]"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#EAECF0]">
              <th className={headCls}>Gadget · Reviewer</th><th className={headCls}>Rating</th><th className={headCls}>Review</th>
              <th className={headCls}>Status</th><th className={`${headCls} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-[#F2F4F7] last:border-0">
                <td className={cellCls}>
                  <div className="font-semibold text-[#111827]">{r.gadget}</div>
                  <div className="text-[13px] text-[#6B7280]">{r.user} · {r.date}</div>
                </td>
                <td className={cellCls}>{r.rating}★</td>
                <td className={`${cellCls} max-w-md`}>
                  <span className={r.status === "pending" ? "line-clamp-2 text-[#344054]" : "text-[#344054]"}>{r.text}</span>
                </td>
                <td className={cellCls}><Pill kind={r.status}>{r.status}</Pill></td>
                <td className={cellCls}>
                  <div className="flex justify-end gap-2">
                    <button className="rounded-md bg-[#111827] px-3 py-1.5 text-[13px] font-semibold text-white disabled:bg-[#D0D5DD] disabled:text-[#98A2B3]"
                      disabled={r.status === "approved"} onClick={() => setStatus(r.id, "approved")}>Approve</button>
                    <button className="rounded-md border border-[#D9DEE7] px-3 py-1.5 text-[13px] font-semibold text-[#344054] hover:bg-[#F4F5F7]"
                      onClick={() => setStatus(r.id, "rejected")}>Reject</button>
                    <button className={iconBtn} title="Edit" onClick={() => setEdit({ id: r.id, text: r.text, rating: r.rating })}><Ico n="pencil" /></button>
                    <button className={iconBtn} title="Delete" onClick={() => setDel(r)}><Ico n="trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td className={`${cellCls} text-[#6B7280]`} colSpan={5}>No reviews in this state.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-5 text-[13px] text-[#6B7280]">
        Showing {shown.length} reviews from the catalog dataset. Approved reviews appear on public product pages after the next data refresh.
      </p>

      {edit && (
        <Modal
          title="Edit review"
          sub="Fix profanity, personal information, or formatting. The reviewer name stays."
          onClose={() => setEdit(null)}
          actions={<>
            <button className={btnOutlineCls} onClick={() => setEdit(null)}>Cancel</button>
            <button className={btnPrimaryCls} onClick={async () => {
              if (edit.text.trim().length < 10 || edit.text.trim().length > 2000) { toast("Review text must be 10–2,000 characters", "alert"); return; }
              const saved = await setRows(rows.map((r) => (r.id === edit.id ? { ...r, text: edit.text.trim(), rating: edit.rating } : r)));
              if (saved) { setEdit(null); toast("Review edited", "edit"); }
            }}>Save</button>
          </>}
        >
          <div>
            <label className={fieldLabelCls} htmlFor="edRating">Rating (1–5)</label>
            <input id="edRating" type="number" min="1" max="5" className={fieldInputCls} value={edit.rating}
              onChange={(e) => setEdit({ ...edit, rating: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="edText">Review text</label>
            <textarea id="edText" rows="5" className={fieldInputCls} value={edit.text}
              onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
          </div>
        </Modal>
      )}

      {del && (
        <Modal
          title="Delete review"
          onClose={() => setDel(null)}
          actions={<>
            <button className={btnOutlineCls} onClick={() => setDel(null)}>Cancel</button>
            <button className={btnDangerCls} onClick={async () => {
              const saved = await setRows(rows.filter((x) => x.id !== del.id));
              if (saved) { setDel(null); toast("Review deleted", "trash"); }
            }}>Delete</button>
          </>}
        >
          <p className="text-[17px] text-[#111827]">Permanently remove the review by <b>{del.user}</b>?</p>
        </Modal>
      )}
    </>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const shown = GW.users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1 className="text-[30px] font-bold text-[#111827]">Users</h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">Registered users and moderation status.</p>
      <input className={`${inputCls} mt-6 !w-72`} placeholder="Search name or email..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-[#EAECF0]">
              <th className={headCls}>User</th><th className={headCls}>Registered</th><th className={headCls}>Status</th>
              <th className={`${headCls} text-right`}>Reviews</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-b border-[#F2F4F7] last:border-0">
                <td className={cellCls}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAECF0] text-[13px] font-bold text-[#475467]">
                      {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#111827]">{u.name}</div>
                      <div className="truncate text-[13px] text-[#6B7280]">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className={cellCls}>{u.registered}</td>
                <td className={cellCls}><Pill kind={u.status}>{u.status}</Pill></td>
                <td className={`${cellCls} text-right font-semibold text-[#111827]`}>{u.reviews}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td className={`${cellCls} text-[#6B7280]`} colSpan={4}>No users match the search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Shell({ tabKey, tab, onOut, children }) {
  const groups = [
    ["overview", [["dashboard", "Dashboard", "dashboard"], ["reports", "Reports", "reports"]]],
    ["catalog", [["gadgets", "Gadgets", "box"], ["categories", "Categories", "layers"]]],
    ["community", [["reviews", "Reviews", "chat"]]],
    ["people", [["users", "Users", "user"]]],
    ["session", [["public", "View public site", "home"], ["out", "Sign out", "exit"]]],
  ];
  return (
    <div className="admin-zoom flex min-h-screen flex-col bg-[#FAFAFB] font-[Inter,ui-sans-serif,system-ui,sans-serif] lg:flex-row">
      <aside className="w-full shrink-0 bg-[#14213A] lg:sticky lg:top-0 lg:h-screen lg:w-[300px] lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <div className="text-[19px] font-bold text-white">Gadget <span className="text-[#A9C4F5]">Wise</span></div>
          <span className="ml-auto rounded bg-white/15 px-[7px] py-[3px] text-[10px] font-bold tracking-[0.1em] text-white">ADMIN</span>
        </div>
        <hr className="border-white/10" />
        <nav className="flex gap-1 overflow-x-auto px-3 pb-5 pt-3 lg:block lg:space-y-4 lg:overflow-visible">
          {groups.map(([group, items]) => (
            <div key={group}>
              <div className="hidden px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7E8FAE] lg:block">{group}</div>
              <ul className="flex gap-1 lg:flex-col lg:space-y-1">
                {items.map(([key, label, icon]) => {
                  const active = key === tabKey;
                  const out = key === "out";
                  return (
                    <li key={key}>
                      <button
                        onClick={() => (key === "public" ? (window.location.hash = "#/") : out ? onOut() : tab(key))}
                        className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-[15px] font-medium ${active ? "bg-[#DCE8FA] text-[#2260D4]" : "text-[#D5DCE9] hover:bg-white/10"}`}
                      >
                        <Ico n={icon} />
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}

function mapAdminGadget(row) {
  const ratings = Array.isArray(row.reviews) ? row.reviews.map((r) => Number(r.rating)).filter(Number.isFinite) : [];
  const rating = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
  return {
    id: row.id, brand: row.brand, model: row.model, category: row.category_id,
    price: Number(row.price), rating: Number(rating.toFixed(1)),
    status: row.is_published ? "published" : "draft", img: row.image_url || "",
    year: row.release_year, summary: row.summary || "", specs: row.specs || {},
    scored: row.scored || {}, value: row.value_data || {}, data_source: row.data_source || "unverified",
    source_url: row.source_url || "", battery: row.battery_hours == null ? 0 : Number(row.battery_hours),
    legacy_data: row.legacy_data || {}, price_verified_at: row.price_verified_at || null,
  };
}
function mapAdminCategory(row) {
  return { id: row.id, name: row.name, desc: row.description || "", is_published: Boolean(row.is_published) };
}
function mapAdminReview(row, gadgetsById, profilesById) {
  const g = gadgetsById.get(row.gadget_id);
  const p = profilesById.get(row.user_id);
  return {
    id: row.id, gadget_id: row.gadget_id, user_id: row.user_id,
    moderated_by: row.moderated_by || null, moderated_at: row.moderated_at || null,
    gadget: g ? g.brand + " " + g.model : row.gadget_id,
    user: (p && p.display_name) || "GadgetWise user",
    date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-PH") : "",
    rating: row.rating, text: row.body, status: row.status,
  };
}
function AdminNotice({ title, body, action }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-extrabold text-[#111827]">{title}</h1>
      <p className="mt-3 leading-6 text-[#667085]">{body}</p>
      {action}
    </section>
  );
}
function AdminOverview({ gadgets, categories, reviews }) {
  const pending = reviews.filter((review) => review.status === "pending").length;
  const published = gadgets.filter((gadget) => gadget.status === "published").length;
  return (
    <div>
      <h1 className="text-[30px] font-bold text-[#111827]">Dashboard</h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">Live counts from the GadgetWise database.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Catalog records", gadgets.length],
          ["Published gadgets", published],
          ["Categories", categories.length],
          ["Pending reviews", pending],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-[#E4E7EC] bg-white p-5">
            <div className="text-sm text-[#667085]">{label}</div>
            <div className="mt-2 text-3xl font-extrabold text-[#111827]">{value}</div>
          </article>
        ))}
      </div>
      <p className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm leading-6 text-[#475467]">
        Product records default to draft/unpublished. Verify specifications and source provenance before publishing them to the public catalog.
      </p>
    </div>
  );
}

export default function Admin() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, ready, configured, signOut } = useAuth();
  const [access, setAccess] = useState("checking");
  const [gadgets, setGadgets] = useState([]);
  const [cats, setCats] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [editing, setEditing] = useState(null);
  const [toast, toastNode] = useToast();
  const tabKey = params.get("tab") || "dashboard";
  const tab = (t) => setParams({ tab: t });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!ready) return;
      if (!supabaseConfigured) { setAccess("unconfigured"); return; }
      if (!user || !user.id) { setAccess("signed-out"); return; }
      setAccess("checking");
      const roleResult = await supabase.from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (cancelled) return;
      if (roleResult.error) { setAccess("error"); return; }
      if (!roleResult.data) { setAccess("forbidden"); return; }
      setAccess("loading-data");
      const results = await Promise.all([
        supabase.from("gadgets").select("id,category_id,brand,model,price,release_year,image_url,summary,specs,scored,value_data,legacy_data,battery_hours,data_source,source_url,price_verified_at,is_published,reviews(rating)").order("brand"),
        supabase.from("categories").select("id,name,description,is_published").order("name"),
        supabase.from("reviews").select("id,gadget_id,user_id,rating,body,status,created_at,moderated_by,moderated_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id,display_name"),
      ]);
      if (cancelled) return;
      const error = results.find((result) => result.error);
      if (error) {
        console.error("Admin data load failed:", error.error.message);
        setAccess("data-error");
        return;
      }
      const mappedGadgets = (results[0].data || []).map(mapAdminGadget);
      const gadgetById = new Map(mappedGadgets.map((g) => [g.id, g]));
      const profileById = new Map((results[3].data || []).map((p) => [p.user_id, p]));
      setGadgets(mappedGadgets);
      setCats((results[1].data || []).map(mapAdminCategory));
      setReviews((results[2].data || []).map((r) => mapAdminReview(r, gadgetById, profileById)));
      setAccess("admin");
    }
    load().catch((error) => {
      console.error("Admin initialization failed:", error instanceof Error ? error.message : "unknown");
      if (!cancelled) setAccess("data-error");
    });
    return () => { cancelled = true; };
  }, [ready, user]);

  async function saveRows(table, oldRows, nextRows, setState, toPayload, primaryKey = "id") {
    const oldById = new Map(oldRows.map((row) => [row[primaryKey], row]));
    const nextById = new Map(nextRows.map((row) => [row[primaryKey], row]));
    try {
      for (const previous of oldRows) {
        if (!nextById.has(previous[primaryKey])) {
          const result = await supabase.from(table).delete().eq(primaryKey, previous[primaryKey]);
          if (result.error) throw result.error;
        }
      }
      for (const next of nextRows) {
        const previous = oldById.get(next[primaryKey]);
        const payload = toPayload(next);
        if (!previous) {
          const result = await supabase.from(table).insert(payload);
          if (result.error) throw result.error;
        } else if (JSON.stringify(toPayload(previous)) !== JSON.stringify(payload)) {
          const result = await supabase.from(table).update(payload).eq(primaryKey, next[primaryKey]);
          if (result.error) throw result.error;
        }
      }
      setState(nextRows);
      return true;
    } catch (error) {
      console.error("Admin save failed:", table, error instanceof Error ? error.message : "unknown");
      toast("Could not save changes to the database. Refresh the page and try again.", "alert");
      return false;
    }
  }

  const setGadgetsPersistently = (next) => saveRows("gadgets", gadgets, next, setGadgets, (g) => ({
    id: g.id, category_id: g.category, brand: g.brand, model: g.model, price: g.price,
    release_year: g.year || null, image_url: g.img || null, summary: g.summary || "",
    specs: g.specs || {}, scored: g.scored || {}, value_data: g.value || {},
    legacy_data: g.legacy_data || {}, battery_hours: g.battery || null, source_url: g.source_url || null,
    price_verified_at: g.price_verified_at || null,
    data_source: g.data_source || "admin_entered_unverified", is_published: g.status === "published",
  }));
  const setCategoriesPersistently = (next) => saveRows("categories", cats, next, setCats, (category) => ({
    id: category.id, name: category.name, description: category.desc || "",
    is_published: Boolean(category.is_published),
  }));
  const setReviewsPersistently = (next) => {
    const prepared = next.map((review) => {
      const existing = reviews.find((row) => row.id === review.id);
      if (review.status === "pending") return { ...review, moderated_by: null, moderated_at: null };
      const statusChanged = !existing || existing.status !== review.status;
      return {
        ...review,
        moderated_by: statusChanged ? user.id : (review.moderated_by || existing?.moderated_by || user.id),
        moderated_at: statusChanged ? new Date().toISOString() : (review.moderated_at || existing?.moderated_at || new Date().toISOString()),
      };
    });
    return saveRows("reviews", reviews, prepared, setReviews, (review) => ({
      id: review.id, gadget_id: review.gadget_id, user_id: review.user_id,
      rating: review.rating, body: review.text, status: review.status,
      moderated_by: review.moderated_by,
      moderated_at: review.moderated_at,
    }));
  };

  if (access === "checking" || access === "loading-data") {
    return <AdminNotice title="Checking administrator access…" body="Verifying your Supabase session and loading persisted records." />;
  }
  if (access === "unconfigured") {
    return <AdminNotice title="Backend not configured" body="The administrative console requires a configured Supabase project. Demo credentials are disabled." />;
  }
  if (access === "signed-out") {
    return <AdminNotice title="Sign in required" body="Sign in with your real GadgetWise account. Administrator access must be assigned securely in the database."
      action={<Link to="/login" className="mt-5 inline-block font-semibold text-[#2563EB] hover:underline">Go to login →</Link>} />;
  }
  if (access === "forbidden") {
    return <AdminNotice title="Administrator access required" body="Your account is authenticated, but it does not have the admin role. A trusted project operator must grant administrator access." />;
  }
  if (access === "error" || access === "data-error") {
    return <AdminNotice title="Admin data unavailable" body="Could not verify your role or load records. Check the Supabase migration, role assignment, and RLS policies, then refresh." />;
  }

  const editIn = (g) => { setEditing(g); tab("add"); };
  const saveGadget = async (fd) => {
    const price = Number(fd.get("price"));
    const brand = String(fd.get("brand") || "").trim();
    const model = String(fd.get("model") || "").trim();
    const category = String(fd.get("category") || "");
    const sourceUrl = String(fd.get("source_url") || "").trim();
    const imageUrl = String(fd.get("img") || "").trim();
    const shouldPublish = fd.get("is_published") === "on";
    if (!(price > 0) || !Number.isFinite(price)) { toast("Enter a valid price greater than zero", "alert"); return; }
    if (!brand || !model) { toast("Brand and model are required", "alert"); return; }
    const selectedCategory = cats.find((item) => item.id === category);
    if (!selectedCategory) { toast("Choose a valid database category", "alert"); return; }
    if (shouldPublish && !selectedCategory.is_published) { toast("Publish the category before publishing a gadget in it", "alert"); return; }
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) { toast("Use a complete HTTP(S) image URL", "alert"); return; }
    if (shouldPublish && !/^https?:\/\//i.test(sourceUrl)) { toast("Add an HTTP(S) source URL before publishing", "alert"); return; }

    const scoreInputs = [
      ["performance", "score_performance"], ["battery", "score_battery"],
      ["durability", "durability"], ["portability", "score_portability"],
      ["display", "score_display"], ["camera", "score_camera"],
      ["storage", "score_storage"], ["repairability", "repairability"],
    ];
    const scored = {};
    for (const [key, field] of scoreInputs) {
      const raw = fd.get(field);
      if (raw === null || String(raw).trim() === "") {
        if (shouldPublish) { toast("Complete all eight scoring inputs before publishing", "alert"); return; }
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 10) { toast("All scoring inputs must be between 0 and 10", "alert"); return; }
      scored[key] = value;
    }

    const specs = {};
    for (let i = 0; i < 50; i += 1) {
      const keyField = "spec_key_" + i;
      const valueField = "spec_value_" + i;
      if (!fd.has(keyField)) break;
      const key = String(fd.get(keyField) || "").trim();
      const value = String(fd.get(valueField) || "").trim();
      if (key && value) specs[key] = value;
    }
    const numberOrZero = (key) => {
      const value = Number(fd.get(key));
      return Number.isFinite(value) && value >= 0 ? value : 0;
    };
    const valueData = {
      warrantyYears: numberOrZero("warranty"),
      lifespanYears: numberOrZero("lifespan"),
      repairabilityLabel: String(fd.get("repair") || "").trim(),
    };
    const payload = {
      id: editing ? editing.id : slugify(brand + " " + model),
      category_id: category, brand, model, price,
      release_year: Number(fd.get("year")) || null,
      image_url: imageUrl || null,
      summary: String(fd.get("summary") || "").trim(),
      specs, scored, value_data: valueData,
      battery_hours: numberOrZero("battery_hours") || null,
      source_url: sourceUrl || null,
      data_source: shouldPublish ? "admin_verified" : "admin_entered_unverified",
      price_verified_at: shouldPublish ? new Date().toISOString() : null,
      legacy_data: editing ? (editing.legacy_data || {}) : {},
      is_published: shouldPublish,
    };
    try {
      const query = supabase.from("gadgets");
      const result = editing
        ? await query.update(payload).eq("id", editing.id).select("id").single()
        : await query.insert(payload).select("id").single();
      if (result.error) throw result.error;
      const { data, error } = await supabase.from("gadgets")
        .select("id,category_id,brand,model,price,release_year,image_url,summary,specs,scored,value_data,legacy_data,battery_hours,data_source,source_url,price_verified_at,is_published,reviews(rating)")
        .order("brand");
      if (error) throw error;
      setGadgets((data || []).map(mapAdminGadget));
      setEditing(null);
      tab("gadgets");
      toast(shouldPublish ? "Gadget published" : "Gadget saved as an unpublished draft");
    } catch (error) {
      console.error("Gadget save failed:", error instanceof Error ? error.message : "unknown");
      toast("Could not save this gadget. Check the validation message and database permissions.", "alert");
    }
  };

  const onOut = async () => {
    try { await signOut(); } finally { nav("/login"); }
  };

  return (
    <Shell tabKey={tabKey} tab={tab} onOut={onOut}>
      {tabKey === "dashboard" && <AdminOverview gadgets={gadgets} categories={cats} reviews={reviews} />}
      {tabKey === "reports" && <AdminNotice title="Reports not yet connected" body="The former reports used static demo metrics. Live analytics need real event collection before they can be shown truthfully." />}
      {tabKey === "gadgets" && <Gadgets tab={tab} rows={gadgets} setRows={setGadgetsPersistently} editIn={editIn} toast={toast} categories={cats} />}
      {tabKey === "add" && <AddGadget tab={tab} onSave={saveGadget} editing={editing} toast={toast} categories={cats} />}
      {tabKey === "categories" && <Categories rows={cats} gadgets={gadgets} setRows={setCategoriesPersistently} toast={toast} />}
      {tabKey === "reviews" && <Reviews rows={reviews} setRows={setReviewsPersistently} toast={toast} />}
      {tabKey === "users" && <AdminNotice title="User directory not yet implemented" body="This page no longer displays fabricated accounts. A production user directory needs a secure server-side Admin API and appropriate privacy controls." />}
      {toastNode}
    </Shell>
  );
}
