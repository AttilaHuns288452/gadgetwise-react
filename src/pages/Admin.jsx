import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GW, money } from "../lib.js";
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

function Signin({ onIn }) {
  const nav = useNavigate();
  return (
    <div className="admin-zoom min-h-screen bg-white px-6 py-8 font-[Inter,ui-sans-serif,system-ui,sans-serif] lg:px-12">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white"><Ico n="box" size={22} /></span>
        <span className="text-[19px] font-bold text-[#111827]">Gadget<span className="text-[#2563EB]">Wise</span></span>
      </div>
      <div className="mt-12 max-w-[1500px]">
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">▪ Staff Console</div>
        <h1 className="mt-3 text-[48px] font-bold leading-none text-[#111827]">Admin sign-in</h1>
        <p className="mt-3 text-[15px] text-[#4B5563]">Gadget Wise team console prototype.</p>
        <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); onIn(); }}>
          <Field label="Staff username">
            <input className={inputCls} defaultValue="admin" name="username" />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" defaultValue="password" name="password" />
          </Field>
          <button type="submit" className="w-full rounded-lg bg-[#1D4E8F] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#163c72]">
            Sign in to console
          </button>
        </form>
        <div className="mt-6 rounded-lg border border-[#F0D8A8] bg-[#FCF3E4] px-4 py-3 text-[13px] text-[#8A6520]">
          Prototype: any credentials work. Staff accounts are managed separately from student accounts.
        </div>
        <button type="button" onClick={() => nav("/")} className="mt-6 block w-full text-center text-[13px] text-[#1B6AC9] hover:underline">
          ← Back to GadgetWise
        </button>
      </div>
    </div>
  );
}

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

function Gadgets({ tab, rows, setRows, editIn, toast }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [del, setDel] = useState(null);
  const cats = [...new Set(GW.gadgets.map((g) => g.category))];
  const filtered = rows.filter((g) =>
    (cat === "all" || g.category === cat) &&
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
        <select className={`${inputCls} !w-44`}>
          <option>All statuses</option>
          <option>Published</option>
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
                <td className={cellCls}><Pill kind="published">Published</Pill></td>
                <td className={cellCls}>
                  <div className="flex justify-end gap-2">
                    <Link to={`/g/${g.id}`} className={iconBtn} title="View public page"><Ico n="eye" /></Link>
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
            <button className={btnDangerCls} onClick={() => {
              setRows(rows.filter((r) => r.id !== del.id));
              setDel(null);
              toast("Gadget deleted", "trash");
            }}>Delete</button>
          </>}
        >
          <p className="text-[17px] text-[#111827]">Remove <b>{displayName(del)}</b> from the catalog?</p>
        </Modal>
      )}
    </>
  );
}

function AddGadget({ tab, onSave, editing, toast }) {
  const form = useRef(null);
  const [specs, setSpecs] = useState(["Weight", "Ports"]);
  const fillSample = () => {
    const f = form.current;
    if (!f) return;
    f.brand.value = "Kaido"; f.model.value = "AirBook 14"; f.category.value = "laptops";
    f.price.value = "39999"; f.year.value = "2026"; f.img.value = "/images/gadgets/kaido-airbook-14.jpg";
    f.summary.value = "A thin 14-inch notebook for study, office work, and light creative tasks.";
    f.warranty.value = "2"; f.lifespan.value = "4.5"; f.repairability.value = "5"; f.durability.value = "7.5";
    f.repair.value = "Kaido authorized service center";
    toast("Mock API response received — verify before saving", "info");
  };
  return (
    <>
      <button className="text-[13px] font-semibold text-[#2260D4] hover:underline" onClick={() => tab("gadgets")}>← Back to list</button>
      <h1 className="mt-3 text-[30px] font-bold text-[#111827]">{editing ? "Edit Gadget" : "Add Gadget"}</h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">Prefill from the sample product API, then verify every field before saving.</p>

      <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-[20px] font-bold text-[#111827]">External product API</h2>
          <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-[12px] font-semibold text-[#2260D4]">Sample data source — admin verification is mandatory</span>
        </div>
        <p className="mt-1 text-[13px] text-[#667085]">
          Click Fetch Product Information to call the sample product API. In production this runs on the server (the browser never calls third-party APIs directly) and returns name, brand, category, and image — which the administrator then verifies or corrects before saving.
        </p>
        <button className={`${btnSecondary} mt-4`} onClick={fillSample}><Ico n="refresh" size={16} /> Fetch Product Information</button>
      </div>
      <div className="mt-4 rounded-lg border border-[#F0D8A8] bg-[#FCF3E4] px-4 py-3 text-[13px] text-[#8A6520]">
        ⚠️ API data is unverified until an administrator reviews and saves it. The API never writes to the catalog by itself.
      </div>

      <form ref={form} className="mt-6 space-y-6" onSubmit={(e) => { e.preventDefault(); onSave(new FormData(e.target)); }}>
        <Panel title="Core details">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Brand"><input name="brand" className={inputCls} placeholder="e.g. Kaido" defaultValue={editing?.brand || ""} /></Field>
            <Field label="Model"><input name="model" className={inputCls} placeholder="e.g. AirBook 14" defaultValue={editing?.model || ""} /></Field>
            <Field label="Category">
              <select name="category" className={inputCls} defaultValue={editing?.category || "smartphones"}>
                {GW.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Price (₱)"><input name="price" className={inputCls} placeholder="39999" defaultValue={editing?.price ?? ""} /></Field>
            <Field label="Release year"><input name="year" className={inputCls} placeholder="2026" /></Field>
            <Field label="Image path"><input name="img" className={inputCls} placeholder="/images/gadgets/product-name.jpg" /></Field>
          </div>
          <div className="mt-5">
            <Field label="Summary">
              <textarea name="summary" rows="3" className={inputCls} placeholder="A short description for product pages and search results." />
            </Field>
          </div>
        </Panel>

        <Panel title="Value & durability">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Warranty (years)"><input name="warranty" className={inputCls} placeholder="2" /></Field>
            <Field label="Estimated lifespan (years)"><input name="lifespan" className={inputCls} placeholder="4.5" /></Field>
            <Field label="Repairability (0–10)"><input name="repairability" className={inputCls} placeholder="5" /></Field>
            <Field label="Durability (0–10)"><input name="durability" className={inputCls} placeholder="7.5" /></Field>
            <Field label="Repair path label"><input name="repair" className={inputCls} placeholder="Kaido authorized service center" /></Field>
          </div>
        </Panel>

        <Panel title="Specifications">
          <div className="space-y-3">
            {specs.map((label, i) => (
              <div key={i} className="flex gap-3">
                <input className={`${inputCls} !w-56`} defaultValue={label} />
                <input className={inputCls} placeholder="Value" />
                <button type="button" className={iconBtn} title="Remove" onClick={() => setSpecs(specs.filter((_, j) => j !== i))}><Ico n="trash" /></button>
              </div>
            ))}
          </div>
          <button type="button" className={`${btnOutline} mt-4`} onClick={() => setSpecs([...specs, ""])}><Ico n="plus" size={16} /> Add specification row</button>
        </Panel>

        <div className="flex gap-3">
          <button type="submit" className={btnPrimary}>Save gadget</button>
          <button type="button" className={btnOutline} onClick={() => tab("gadgets")}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function Categories({ rows, setRows, toast }) {
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const counts = Object.fromEntries(
    rows.map((c) => {
      const inCat = GW.gadgets.filter((g) => g.category === c.id);
      return [c.id, { n: inCat.length, avg: inCat.length ? (inCat.reduce((s, g) => s + g.rating, 0) / inCat.length).toFixed(1) : "0.0" }];
    })
  );
  const save = () => {
    const name = form.name.trim();
    if (!name) { toast("Give the category a name", "alert"); return; }
    if (rows.some((r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== form.editing)) {
      toast("A category with that name already exists", "alert"); return;
    }
    setRows(form.editing
      ? rows.map((r) => (r.id === form.editing ? { ...r, name, desc: form.desc } : r))
      : [...rows, { id: slugify(name), name, desc: form.desc }]);
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
              <button className={`${btnDangerCls} disabled:cursor-not-allowed disabled:bg-[#D0D5DD] disabled:text-[#667085]`} disabled={n > 0} onClick={() => {
                setRows(rows.filter((r) => r.id !== del.id));
                setDel(null);
                toast("Category deleted", "trash");
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
  const setStatus = (id, status) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, status } : r)));
    toast(status === "approved" ? "Review approved — now visible on the gadget page" : "Review rejected — hidden from the public site",
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
            <button className={btnPrimaryCls} onClick={() => {
              if (!edit.text.trim()) { toast("Review text cannot be empty", "alert"); return; }
              setRows(rows.map((r) => (r.id === edit.id ? { ...r, text: edit.text, rating: edit.rating } : r)));
              setEdit(null);
              toast("Review edited", "edit");
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
            <button className={btnDangerCls} onClick={() => {
              setRows(rows.filter((x) => x.id !== del.id));
              setDel(null);
              toast("Review deleted", "trash");
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

export default function Admin() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [inSession, setIn] = useState(() => sessionStorage.getItem("gw-admin") === "1");
  const tabKey = params.get("tab") || "dashboard";
  const tab = (t) => setParams({ tab: t });
  const [gadgets, setGadgets] = useState(GW.gadgets);
  const [cats, setCats] = useState(() => GW.categories.map(toCat));
  const [reviews, setReviews] = useState(GW.admin.moderation);
  const [editing, setEditing] = useState(null);
  const [toast, toastNode] = useToast();

  if (!inSession) {
    return <Signin onIn={() => { sessionStorage.setItem("gw-admin", "1"); setIn(true); }} />;
  }

  const editIn = (g) => { setEditing(g); tab("add"); };
  const saveGadget = (fd) => {
    const price = Number(fd.get("price"));
    if (!(price > 0)) { toast("Enter a price greater than zero", "alert"); return; }
    const cat = fd.get("category");
    if (!GW.categories.some((c) => c.id === cat)) {
      toast("Pick a category from the list (manage categories on the Categories page)", "alert"); return;
    }
    const name = `${fd.get("brand") || ""} ${fd.get("model") || ""}`.trim() || "Untitled gadget";
    if (!editing) {
      setGadgets([...gadgets, {
        id: slugify(name), brand: fd.get("brand") || "", model: fd.get("model") || "", category: cat,
        price, rating: 0, status: "published",
        img: fd.get("img") || "/images/gadgets/kaido-airbook-14.jpg",
      }]);
    }
    setEditing(null);
    tab("gadgets");
    toast(editing ? "Changes saved" : "Gadget created — status: published");
  };

  return (
    <Shell tabKey={tabKey} tab={tab} onOut={() => { sessionStorage.removeItem("gw-admin"); setIn(false); }}>
      {tabKey === "dashboard" && <Dashboard tab={tab} />}
      {tabKey === "reports" && <Reports />}
      {tabKey === "gadgets" && <Gadgets tab={tab} rows={gadgets} setRows={setGadgets} editIn={editIn} toast={toast} />}
      {tabKey === "add" && <AddGadget tab={tab} onSave={saveGadget} editing={editing} toast={toast} />}
      {tabKey === "categories" && <Categories rows={cats} setRows={setCats} toast={toast} />}
      {tabKey === "reviews" && <Reviews rows={reviews} setRows={setReviews} toast={toast} />}
      {tabKey === "users" && <Users />}
      {toastNode}
    </Shell>
  );
}
