import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GW, money } from "../lib.js";
import { catalogStats } from "../lib/catalog.js";
import { Logo } from "../components/ui.jsx";
import { loadAllReviews, setReviewStatus, editReview, deleteReview, loadCategories, saveCategory, deleteCategory, loadProducts, saveProduct, deleteProduct, loadViewStats } from "../lib/store.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.js";
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

const toCat = (c) => ({ id: c.id, name: c.name, desc: c.blurb });

function Dashboard({ tab, stats, pendingRows }) {
  const s = stats;
  const [views, setViews] = useState({ topViewed: [], weeklyViews: [0, 0, 0, 0] });
  useEffect(() => { loadViewStats().then((r) => r.ok && setViews(r)); }, []);
  const statCards = [
    ["Products tracked", s.total, { text: `${s.categories.length} categories` }, {}],
    ["Avg list price", money(s.avgPrice), { text: "across live catalog" }, {}],
    ["Rated products", s.withRating, { text: `${s.avgRating} avg rating` }, {}],
    ["Pending reviews", pendingRows.length, { text: "needs moderation", down: true }, { tone: "amber" }],
  ];
  const preview = pendingRows.slice(0, 4);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Dashboard</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">Catalog and moderation queues. Product figures are counted live from the marketplace catalog; no traffic metrics are invented.</p>
        </div>
        <div className="flex gap-3">
          <button className={btnSecondary} onClick={() => tab("reviews")}>Moderation queue</button>
          <button className={btnPrimary} onClick={() => tab("gadgets")}><Ico n="cube" size={16} /> View catalog</button>
        </div>
      </div>
      <hr className="mt-6 border-[#EAECF0]" />

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.map(([label, value, trend, opts]) => (
          <StatCard key={label} label={label} value={value} trend={trend} {...opts} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[52fr_44fr]">
        <Panel title="Products by category" action={<button className="text-[14px] font-semibold text-[#2260D4] hover:underline" onClick={() => tab("reports")}>Full reports →</button>}>
          <BarList rows={stats.categories.map((c) => [c.name, c.count])} />
        </Panel>
        <Panel title="Most viewed products">
          {views.topViewed.length
            ? <BarList rows={views.topViewed.map((v) => [v.id.slice(0, 18), v.views])} />
            : <p className="text-[15px] text-[#6B7280]">No product views recorded yet. Views are counted live as people open product pages.</p>}
        </Panel>
        <Panel title="Product views — last 4 weeks">
          <BarList rows={["4 wks ago", "3 wks ago", "2 wks ago", "This week"].map((w, i) => [w, views.weeklyViews[i] || 0])} />
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
        <Panel title="Data sources">
          <p className="text-[15px] leading-relaxed text-[#4B5563]">
            Product counts and prices are counted live from the marketplace catalog. Review
            counts and page views come from the database (product_views) — these analytics are
            counted for real, never estimated or fabricated.
          </p>
        </Panel>
        <Panel title="Catalog health">
          <p className="text-[15px] leading-relaxed text-[#4B5563]">
            {stats.withRating} of {stats.total} products carry a marketplace rating ({stats.avgRating} average).
            Battery and warranty specs are unavailable from the marketplace and are shown as
            "Not available" rather than estimated.
          </p>
        </Panel>
      </div>
    </>
  );
}

function Reports({ stats }) {
  const [dt, setDt] = useState(null);
  const maxCat = Math.max(1, ...stats.categories.map((c) => c.count));
  return (
    <>
      <h1 className="text-[30px] font-bold text-[#111827]">Reports</h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">
        Catalog composition counted live from {stats.total} real marketplace products.
        No traffic, page-view, or engagement metrics are shown because none are collected —
        presenting invented numbers here would be misleading.
      </p>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Products by category">
          <BarList rows={stats.categories.map((c) => [c.name, c.count])} />
        </Panel>
        <Panel title="Catalog summary">
          <table className="w-full text-[14px]">
            <tbody>
              <tr className="border-b border-[#F2F4F7]"><td className={cellCls}>Total products</td><td className={`${cellCls} text-right font-semibold`}>{stats.total}</td></tr>
              <tr className="border-b border-[#F2F4F7]"><td className={cellCls}>Categories</td><td className={`${cellCls} text-right font-semibold`}>{stats.categories.length}</td></tr>
              <tr className="border-b border-[#F2F4F7]"><td className={cellCls}>Average list price</td><td className={`${cellCls} text-right font-semibold`}>{money(stats.avgPrice)}</td></tr>
              <tr className="border-b border-[#F2F4F7]"><td className={cellCls}>Products with ratings</td><td className={`${cellCls} text-right font-semibold`}>{stats.withRating}</td></tr>
              <tr><td className={cellCls}>Average rating</td><td className={`${cellCls} text-right font-semibold`}>{stats.avgRating}★</td></tr>
            </tbody>
          </table>
        </Panel>
      </div>
      <p className="mt-6 text-[13px] text-[#6B7280]">
        These figures are computed from the live product catalog on page load. When real
        event tracking is added later, view and comparison analytics can be introduced here.
      </p>
    </>
  );
}

function Gadgets({ toast }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const cats = GW.categories.map((c) => c.id);
  const reload = async () => { const r = await loadProducts(); if (r.ok) setRows(r.rows); };
  useEffect(() => { reload(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form?.model?.trim()) { toast("Model name is required", "alert"); return; }
    const res = await saveProduct(form.id || null, form);
    if (res.ok) { setForm(null); reload(); toast(form.id ? "Gadget updated" : "Gadget added to the catalog"); }
    else toast(res.error || "Could not save", "alert");
  };
  const del = async (id) => {
    const res = await deleteProduct(id);
    if (res.ok) { reload(); toast("Gadget deleted"); } else toast(res.error || "Could not delete", "alert");
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Gadgets</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">GadgetWise-curated products. Add, edit, or remove them — saved to the database and shown in the catalog.</p>
        </div>
        <button className={btnPrimary} onClick={() => setForm({ model: "", brand: "", category: "smartphones", price: "", image: "" })}><Ico n="plus" size={16} /> Add gadget</button>
      </div>

      {form && (
        <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6">
          <h2 className="text-[19px] font-bold text-[#111827]">{form.id ? "Edit gadget" : "New gadget"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Brand"><input className={fieldInputCls} value={form.brand || ""} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Samsung" /></Field>
            <Field label="Model"><input className={fieldInputCls} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. Galaxy A55" /></Field>
            <Field label="Category">
              <select className={fieldInputCls} value={form.category || ""} onChange={(e) => set("category", e.target.value)}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Price (₱)"><input type="number" className={fieldInputCls} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0" /></Field>
            <Field label="Original price (₱, optional)"><input type="number" className={fieldInputCls} value={form.original_price || ""} onChange={(e) => set("original_price", e.target.value)} /></Field>
            <Field label="Image URL"><input className={fieldInputCls} value={form.image || ""} onChange={(e) => set("image", e.target.value)} placeholder="https://…" /></Field>
            <div className="sm:col-span-2"><Field label="Description"><textarea rows="3" className={fieldInputCls} value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></Field></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} onClick={save}>Save</button>
            <button className={iconBtn} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white">
        <table className="w-full text-left text-[14px]">
          <thead><tr className="border-b border-[#E4E7EC] text-[13px] uppercase tracking-wide text-[#667085]">
            <th className="px-4 py-3">Gadget</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="border-b border-[#F0F2F5]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {g.image ? <img src={g.image} alt="" className="h-10 w-10 rounded-md border border-[#E4E7EC] object-cover" /> : null}
                    <div><div className="font-medium text-[#111827]">{[g.brand, g.model].filter(Boolean).join(" ")}</div></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#4B5563]">{g.category || "—"}</td>
                <td className="px-4 py-3 mono text-[#111827]">{g.price != null ? money(g.price) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button className={iconBtn} title="Edit" onClick={() => setForm({ ...g })}><Ico n="pencil" /></button>
                    <button className={iconBtn} title="Delete" onClick={() => del(g.id)}><Ico n="trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6B7280]">No curated gadgets yet. Add one above.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Categories({ toast }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null); // {id?, name, blurb, sort_order}
  const reload = async () => { const r = await loadCategories(); if (r.ok) setRows(r.rows); };
  useEffect(() => { reload(); }, []);
  const save = async () => {
    if (!form?.name?.trim()) { toast("Name is required", "alert"); return; }
    const res = await saveCategory(form.id || null, form);
    if (res.ok) { setForm(null); reload(); toast(form.id ? "Category updated" : "Category added"); }
    else toast(res.error || "Could not save", "alert");
  };
  const del = async (id) => {
    const res = await deleteCategory(id);
    if (res.ok) { reload(); toast("Category deleted"); } else toast(res.error || "Could not delete", "alert");
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Categories</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">Catalog categories. Add, edit, or remove them here — saved to the database.</p>
        </div>
        <button className={btnPrimary} onClick={() => setForm({ name: "", blurb: "", sort_order: 0 })}><Ico n="plus" size={16} /> Add category</button>
      </div>

      {form && (
        <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6">
          <h2 className="text-[19px] font-bold text-[#111827]">{form.id ? "Edit category" : "New category"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input className={fieldInputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Smartphones" /></Field>
            <Field label="Sort order"><input type="number" className={fieldInputCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
            <div className="sm:col-span-2"><Field label="Description"><input className={fieldInputCls} value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} placeholder="Short description shown on the category" /></Field></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} onClick={save}>Save</button>
            <button className={iconBtn} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="min-w-0 rounded-xl border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF3FC] text-[#2260D4]"><Ico n="cube" size={18} /></span>
                <div>
                  <h3 className="text-[20px] font-bold text-[#111827]">{c.name}</h3>
                  <p className="text-[13px] text-[#667085]">sort {c.sort_order}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={iconBtn} title="Edit" onClick={() => setForm({ id: c.id, name: c.name, blurb: c.blurb || "", sort_order: c.sort_order || 0 })}><Ico n="pencil" /></button>
                <button className={iconBtn} title="Delete" onClick={() => del(c.id)}><Ico n="trash" /></button>
              </div>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-[#4B5563]">{c.blurb || "No description."}</p>
          </div>
        ))}
        {!rows.length && <p className="text-[15px] text-[#6B7280]">No categories yet. Add one above.</p>}
      </div>
    </>
  );
}

function Reviews({ rows, setRows, loaded, reload, toast }) {
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(null);
  const pending = rows.filter((r) => r.status === "pending").length;
  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  // Real DB write. Only report success after the database confirms — never
  // flip local state and claim success on a failed write.
  const setStatus = async (id, status) => {
    setBusy(id);
    const res = await setReviewStatus(id, status);
    setBusy(null);
    if (!res.ok) {
      toast(`Could not update review: ${res.error}`, "alert");
      return;
    }
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
            <button className={btnPrimaryCls} onClick={async () => {
              if (!edit.text.trim()) { toast("Review text cannot be empty", "alert"); return; }
              const res = await editReview(edit.id, { rating: edit.rating, body: edit.text });
              if (!res.ok) { toast(`Could not save review: ${res.error}`, "alert"); return; }
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
            <button className={btnDangerCls} onClick={async () => {
              const res = await deleteReview(del.id);
              if (!res.ok) { toast(`Could not delete review: ${res.error}`, "alert"); return; }
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
  const [users, setUsers] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [err, setErr] = useState("");

  // Real registered users, fetched server-side with this admin's verified
  // session. The fabricated demo roster is gone; if the request fails we say so.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error("Not signed in");
        const r = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(j?.error?.message || "Could not load users");
        setUsers(j.users || []);
        setState("ready");
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Could not load users");
        setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—");
  const initials = (email) => (email || "?").slice(0, 2).toUpperCase();
  const shown = users.filter((u) => `${u.email} ${u.id}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1 className="text-[30px] font-bold text-[#111827]">Users</h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">Real registered accounts from the authentication provider. No demo or seeded users are shown.</p>
      {state === "loading" && <p className="mt-6 text-[15px] text-[#6B7280]">Loading registered users…</p>}
      {state === "error" && (
        <div className="mt-6 rounded-xl border border-[#F5C6C6] bg-[#FEF3F3] p-5 text-[15px] text-[#B42318]">
          Could not load users: {err}
        </div>
      )}
      {state === "ready" && (
      <>
      <div className="mt-4 text-[14px] text-[#6B7280]">{users.length} registered account{users.length === 1 ? "" : "s"}</div>
      <input className={`${inputCls} mt-4 !w-72`} placeholder="Search by email..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-[#EAECF0]">
              <th className={headCls}>Account</th><th className={headCls}>Registered</th><th className={headCls}>Last sign-in</th>
              <th className={`${headCls} text-right`}>Email confirmed</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-b border-[#F2F4F7] last:border-0">
                <td className={cellCls}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAECF0] text-[13px] font-bold text-[#475467]">
                      {initials(u.email)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#111827]">{u.email}</div>
                      <div className="truncate text-[13px] text-[#6B7280]">{u.id}</div>
                    </div>
                  </div>
                </td>
                <td className={cellCls}>{fmtDate(u.createdAt)}</td>
                <td className={cellCls}>{fmtDate(u.lastSignIn)}</td>
                <td className={`${cellCls} text-right`}>
                  <Pill kind={u.confirmed ? "approved" : "pending"}>{u.confirmed ? "confirmed" : "pending"}</Pill>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td className={`${cellCls} text-[#6B7280]`} colSpan={4}>No users match the search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
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
          <Logo size={17} tone="light" />
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
  const { signOut } = useAuth();
  const tabKey = params.get("tab") || "dashboard";
  const tab = (t) => setParams({ tab: t });
  // Real reviews from the database (never the fixture). Loaded on mount.
  const [reviews, setReviews] = useState([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [toast, toastNode] = useToast();
  const stats = catalogStats(GW.gadgets);

  useEffect(() => {
    let alive = true;
    loadAllReviews().then((res) => {
      if (!alive) return;
      if (res.ok) setReviews(res.rows);
      setReviewsLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const reloadReviews = async () => {
    const res = await loadAllReviews();
    if (res.ok) setReviews(res.rows);
  };

  return (
    <Shell tabKey={tabKey} tab={tab} onOut={async () => { await signOut(); nav("/"); }}>
      {tabKey === "dashboard" && (
        <Dashboard tab={tab} stats={stats} pendingRows={reviews.filter((r) => r.status === "pending")} />
      )}
      {tabKey === "reports" && <Reports stats={stats} />}
      {tabKey === "gadgets" && <Gadgets toast={toast} />}
      {tabKey === "categories" && <Categories toast={toast} />}
      {tabKey === "reviews" && (
        <Reviews rows={reviews} setRows={setReviews} loaded={reviewsLoaded} reload={reloadReviews} toast={toast} />
      )}
      {tabKey === "users" && <Users />}
      {toastNode}
    </Shell>
  );
}
