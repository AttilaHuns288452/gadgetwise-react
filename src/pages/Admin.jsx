import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GW, money } from "../lib.js";
import { catalogStats } from "../lib/catalog.js";
import { Logo } from "../components/ui.jsx";
import { loadAllReviews, loadCategories, saveCategory, deleteCategory, loadProducts, saveProduct, deleteProduct, loadViewStats, getPublicProfile, loadIntegrationStatus, loadIntegrationConfig, saveIntegrationKey, loadSiteSettings, saveSiteSetting, setUserRole, loadForbiddenWords, saveForbiddenWord, setForbiddenWordEnabled, deleteForbiddenWord, loadActivityLog } from "../lib/store.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.js";
import { Modal, ConfirmDialog, useToast, btnPrimaryCls, btnOutlineCls, btnDangerCls, fieldLabelCls, fieldInputCls, displayName, focusField, FieldError } from "../components/ui.jsx";

const ICONS = {
  dashboard: "M4 4h6v6H4zM14 4h6v10h-6zM4 14h6v6H4zM14 18h6v2h-6z",
  reports: "M4 20V6M10 20V10M16 20V4M4 20h16",
  plug: "M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5",
  shield: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zm1 9V7h-2v7h6v-2h-4z",
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
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 break-words text-[20px] font-bold text-[#111827]">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BarList({ rows }) {
  if (!rows.length) {
    return <div className="rounded-lg border border-dashed border-[#D9DEE7] bg-[#FAFBFC] p-5 text-[14px] leading-relaxed text-[#667085]">No data has been recorded for this view yet.</div>;
  }
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <ul className="space-y-3.5">
      {rows.map(([name, value]) => (
        <li key={name} className="flex min-w-0 items-center gap-4">
          <span className="w-28 shrink-0 truncate text-[15px] text-[#344054] sm:w-72">{name}</span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-[#EEF2F7]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-[#2260D4] to-[#5B9DF0] transition-[width] duration-500"
              style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
            />
          </span>
          <span className="w-16 shrink-0 text-right text-[15px] font-semibold text-[#111827]">{value.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

/* Vertical mini-chart for a short time series (e.g. weekly counts). */
function MiniBars({ data, labels }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-36 items-end gap-3">
      {data.map((v, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-[#2260D4] to-[#5B9DF0] transition-[height] duration-500"
              style={{ height: `${Math.max(2, (v / max) * 100)}%`, opacity: v ? 1 : 0.22 }}
            />
          </div>
          <span className="text-[11px] text-[#667085]">{labels[i]}</span>
          <span className="text-xs font-semibold text-[#111827]">{v.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, trend, tone }) {
  const amber = tone === "amber";
  // neutral: informational text (no directional arrow / green-red implication)
  const neutral = trend.neutral;
  return (
    <div
      className={`hover-lift relative overflow-hidden rounded-xl border bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)] ${amber ? "border-2 border-[#B07C28]" : "border-[#E4E7EC]"}`}
    >
      {/* accent rail: gives each stat a visual anchor without decoration */}
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${amber ? "bg-[#B07C28]" : "bg-gradient-to-r from-[#2260D4] to-[#5B9DF0]"}`} />
      <div className="text-[13px] text-[#667085]">{label}</div>
      <div className={`mt-1 break-words text-[26px] font-bold leading-none sm:text-[34px] xl:text-[40px] ${amber ? "text-[#7C4708]" : "text-[#111827]"}`}>{value}</div>
      <div className={`mt-3 flex items-center gap-1.5 text-[13px] font-semibold ${neutral ? "text-[#667085]" : trend.down ? "text-[#C0392B]" : "text-[#12B76A]"}`}>
        {!neutral && <Ico n="trendUp" size={15} />} {trend.text}
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
    ["Products tracked", s.total, { text: `${s.categories.length} categories`, neutral: true }, {}],
    ["Avg list price", money(s.avgPrice), { text: "across live catalog", neutral: true }, {}],
    ["Rated products", s.withRating, { text: s.withRating ? `${s.avgRating} avg rating` : "No ratings yet", neutral: !s.withRating }, {}],
  ];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Dashboard</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">Catalog management. Product figures are counted live from the marketplace catalog; no traffic metrics are invented.</p>
        </div>
        <div className="flex gap-3">
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
            ? <BarList rows={views.topViewed.map((v) => [GW.getGadget(v.id) ? GW.displayName(GW.getGadget(v.id)) : v.id.slice(0, 18), v.views])} />
            : <p className="text-[15px] text-[#6B7280]">No product views recorded yet. Views are counted live as people open product pages.</p>}
        </Panel>
        <Panel title="Product views. Last 4 weeks">
          <MiniBars data={views.weeklyViews.map((n) => n || 0)} labels={["4 wks", "3 wks", "2 wks", "This week"]} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Data sources">
          <p className="text-[15px] leading-relaxed text-[#4B5563]">
            Product counts and prices are counted live from the marketplace catalog. Review
            counts and page views come from the database (product_views). These analytics are
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
        No traffic, page-view, or engagement metrics are shown because none are collected:
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
              <tr><td className={cellCls}>Average rating</td><td className={`${cellCls} text-right font-semibold`}>{stats.withRating ? `${stats.avgRating}★` : "No ratings"}</td></tr>
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
  const set = (k, v) => { setErr(null); setForm((f) => ({ ...f, [k]: v })); };
  const [err, setErr] = useState(null); // {field, msg}
  const fail = (field, msg) => { setErr({ field, msg }); focusField("#" + field); };
  const save = async () => {
    if (!form?.model?.trim()) { fail("adm-model", "Model name is required."); return; }
    // trust-boundary validation: reject malformed prices before they reach the DB
    const price = form.price === "" || form.price == null ? null : Number(form.price);
    const orig = form.original_price === "" || form.original_price == null ? null : Number(form.original_price);
    if (price != null && (!Number.isFinite(price) || price <= 0)) { fail("adm-price", "Price must be a number greater than zero."); return; }
    if (orig != null && (!Number.isFinite(orig) || orig <= 0)) { fail("adm-orig-price", "Original price must be a number greater than zero."); return; }
    const res = await saveProduct(form.id || null, { ...form, price, original_price: orig });
    if (res.ok) { setForm(null); await reload(); toast(form.id ? "Gadget updated" : "Gadget added to the catalog"); }
    else toast(res.error || "Could not save", "alert");
  };
  // Unsaved-changes guard: cancelling an edited form must not silently eat it.
  const [pristine, setPristine] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const formDirty = !!form && !!pristine && JSON.stringify(form) !== JSON.stringify(pristine);
  const requestClose = () => (formDirty ? setDiscardOpen(true) : setForm(null));
  const openForm = (f) => { setForm(f); setPristine(f); };
  const [delTarget, setDelTarget] = useState(null); // {id, name}
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState(null);
  const confirmDelete = async () => {
    if (!delTarget) return;
    setDelBusy(true); setDelError(null);
    const res = await deleteProduct(delTarget.id);
    if (!res.ok) { setDelError(res.error || "Could not delete"); setDelBusy(false); return; }
    reload(); toast("Gadget deleted", "trash");
    setDelBusy(false); setDelTarget(null);
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Gadgets</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">GadgetWise-curated products. Add, edit, or remove them. Saved to the database and shown in the catalog.</p>
          <p className="mt-2 text-[13px] text-[#B42318]">Remove any propagation-test or placeholder rows before publishing a product.</p>
        </div>
        <button className={btnPrimary} onClick={() => openForm({ model: "", brand: "", category: "smartphones", price: "", image: "" })}><Ico n="plus" size={16} /> Add gadget</button>
      </div>

      {form && (
        <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6">
          <h2 className="text-[19px] font-bold text-[#111827]">{form.id ? "Edit gadget" : "New gadget"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Brand"><input className={fieldInputCls} value={form.brand || ""} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Samsung" /></Field>
            <Field label="Model"><input id="adm-model" className={fieldInputCls} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. Galaxy A55"
              aria-invalid={err?.field === "adm-model" ? "true" : undefined} aria-describedby={err?.field === "adm-model" ? "adm-model-error" : undefined} />
              {err?.field === "adm-model" && <FieldError id="adm-model">{err.msg}</FieldError>}</Field>
            <Field label="Category">
              <select className={fieldInputCls} value={form.category || ""} onChange={(e) => set("category", e.target.value)}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Price (₱)"><input id="adm-price" type="number" className={fieldInputCls} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0"
              aria-invalid={err?.field === "adm-price" ? "true" : undefined} aria-describedby={err?.field === "adm-price" ? "adm-price-error" : undefined} />
              {err?.field === "adm-price" && <FieldError id="adm-price">{err.msg}</FieldError>}</Field>
            <Field label="Original price (₱, optional)"><input id="adm-orig-price" type="number" className={fieldInputCls} value={form.original_price || ""} onChange={(e) => set("original_price", e.target.value)}
              aria-invalid={err?.field === "adm-orig-price" ? "true" : undefined} aria-describedby={err?.field === "adm-orig-price" ? "adm-orig-price-error" : undefined} />
              {err?.field === "adm-orig-price" && <FieldError id="adm-orig-price">{err.msg}</FieldError>}</Field>
            <Field label="Image URL"><input className={fieldInputCls} value={form.image || ""} onChange={(e) => set("image", e.target.value)} placeholder="https://…" /></Field>
            <div className="sm:col-span-2"><Field label="Description"><textarea rows="3" className={fieldInputCls} value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></Field></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} onClick={save}>Save</button>
            <button className={iconBtn} onClick={requestClose}>Cancel</button>
          </div>
        </div>
      )}

      {rows.length > 0 && (() => {
        const missingImage = rows.filter((g) => !g.image).length;
        const missingDescription = rows.filter((g) => !g.description).length;
        const missingPrice = rows.filter((g) => g.price == null).length;
        const needing = missingImage + missingDescription + missingPrice;
        if (!needing) return null;
        return (
          <div className="mt-6 rounded-xl border border-[#F5E2B8] bg-[#FFF8E6] px-5 py-4">
            <div className="text-[14px] font-semibold text-[#6B4E12]">
              {needing} field{needing === 1 ? "" : "s"} need attention across {rows.length} record{rows.length === 1 ? "" : "s"}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[13px] text-[#7A5A12]">
              {missingImage > 0 && <span className="rounded-full bg-[#F5E4B0] px-2.5 py-1">{missingImage} missing image</span>}
              {missingDescription > 0 && <span className="rounded-full bg-[#F5E4B0] px-2.5 py-1">{missingDescription} missing description</span>}
              {missingPrice > 0 && <span className="rounded-full bg-[#F5E4B0] px-2.5 py-1">{missingPrice} missing price</span>}
            </div>
            <p className="mt-2 text-[12px] text-[#7A5A12]">Products with missing fields are hidden from public discovery. Edit a record to complete it.</p>
          </div>
        );
      })()}

      <div className="mt-6 scroll-fade overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white">
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
                <td className="px-4 py-3 text-[#4B5563]">{g.category ? g.category.charAt(0).toUpperCase() + g.category.slice(1) : "N/A"}</td>
                <td className="px-4 py-3 mono text-[#111827]">{g.price != null ? money(g.price) : "N/A"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button className={iconBtn} title="Edit" aria-label={`Edit ${[g.brand, g.model].filter(Boolean).join(" ") || "gadget"}`} onClick={() => openForm({ ...g })}><Ico n="pencil" /></button>
                    <button className={iconBtn} title="Delete" aria-label={`Delete ${[g.brand, g.model].filter(Boolean).join(" ") || "this gadget"}`} onClick={() => setDelTarget({ id: g.id, name: [g.brand, g.model].filter(Boolean).join(" ") || "this gadget" })}><Ico n="trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6B7280]">No curated gadgets yet. Add one above.</td></tr>}
          </tbody>
        </table>
      </div>
      {discardOpen && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="This gadget form has edits that have not been saved. Discard them?"
          confirmLabel="Discard changes"
          danger
          onConfirm={() => { setDiscardOpen(false); setForm(null); setPristine(null); }}
          onClose={() => setDiscardOpen(false)}
        />
      )}
      {delTarget && (
        <ConfirmDialog
          title="Delete gadget?"
          message={<span>Permanently delete <b>{delTarget.name}</b> from the catalog? This cannot be undone.</span>}
          confirmLabel="Delete"
          danger
          busy={delBusy}
          error={delError}
          onConfirm={confirmDelete}
          onClose={() => { if (!delBusy) { setDelTarget(null); setDelError(null); } }}
        />
      )}
    </>
  );
}

function Categories({ toast }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null); // {id?, name, blurb, sort_order}
  const [err, setErr] = useState(null); // {field, msg}
  const fail = (field, msg) => { setErr({ field, msg }); focusField("#" + field); };
  const reload = async () => { const r = await loadCategories(); if (r.ok) setRows(r.rows); };
  useEffect(() => { reload(); }, []);
  const categoryCounts = GW.gadgets.reduce((map, g) => map.set(g.category, (map.get(g.category) || 0) + 1), new Map());
  const save = async () => {
    if (!form?.name?.trim()) { fail("adm-cat-name", "Name is required."); return; }
    // the slug is the app's category id: derive it from the name once (creating),
    // never rename it afterwards (products and quiz cases reference it)
    const slug = form.slug || form.name;
    const res = await saveCategory(form.id || null, { ...form, slug });
    if (res.ok) { setForm(null); await reload(); toast(form.id ? "Category updated" : "Category added"); }
    else toast(res.error || "Could not save", "alert");
  };
  // Unsaved-changes guard: cancelling an edited form must not silently eat it.
  const [pristine, setPristine] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const formDirty = !!form && !!pristine && JSON.stringify(form) !== JSON.stringify(pristine);
  const requestClose = () => (formDirty ? setDiscardOpen(true) : setForm(null));
  const openForm = (f) => { setForm(f); setPristine(f); };
  const [delTarget, setDelTarget] = useState(null); // {id, name}
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState(null);
  const confirmDelete = async () => {
    if (!delTarget) return;
    setDelBusy(true); setDelError(null);
    const res = await deleteCategory(delTarget.id);
    if (!res.ok) { setDelError(res.error || "Could not delete"); setDelBusy(false); return; }
    reload(); toast("Category deleted", "trash");
    setDelBusy(false); setDelTarget(null);
  };
  return (
    <>
      <div className="rounded-2xl border border-[#DCE7F8] bg-[linear-gradient(135deg,#F8FBFF_0%,#EEF5FF_100%)] p-6 shadow-[0_12px_30px_rgba(31,78,121,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2260D4]">Catalog structure</p>
            <h1 className="mt-2 text-[30px] font-bold text-[#111827]">Categories</h1>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[#475467]">Categories are lightweight navigation labels for the marketplace catalog. Use them to group products and power filters, not to invent product records.</p>
          </div>
          <button className={btnPrimary} onClick={() => openForm({ name: "", blurb: "", sort_order: rows.length, query: "" })}><Ico n="plus" size={16} /> Add category</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/80 bg-white/75 px-4 py-3"><div className="mono text-2xl font-bold text-[#14213A]">{rows.length}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Configured labels</div></div>
          <div className="rounded-xl border border-white/80 bg-white/75 px-4 py-3"><div className="mono text-2xl font-bold text-[#14213A]">{GW.gadgets.length}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Live products</div></div>
          <div className="rounded-xl border border-white/80 bg-white/75 px-4 py-3"><div className="mono text-2xl font-bold text-[#14213A]">{new Set(GW.gadgets.map((g) => g.category)).size}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Marketplace groups</div></div>
        </div>
      </div>

      {form && (
        <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6">
          <h2 className="text-[19px] font-bold text-[#111827]">{form.id ? "Edit category" : "New category"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input id="adm-cat-name" className={fieldInputCls} required value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErr(null); }} placeholder="e.g. Smartphones"
              aria-invalid={err?.field === "adm-cat-name" ? "true" : undefined} aria-describedby={err?.field === "adm-cat-name" ? "adm-cat-name-error" : undefined} />
              {err?.field === "adm-cat-name" && <FieldError id="adm-cat-name">{err.msg}</FieldError>}</Field>
            <Field label="Sort order"><input type="number" className={fieldInputCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Marketplace search query">
                <input className={fieldInputCls} value={form.query || ""} onChange={(e) => setForm({ ...form, query: e.target.value })} placeholder="e.g. smartwatch" />
              </Field>
              <p className="mt-1 text-xs text-[#667085]">
                This keyword fills the category with live marketplace products. Leave empty to keep the current products for this category.
              </p>
            </div>
            <div className="sm:col-span-2"><Field label="Description"><input className={fieldInputCls} value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} placeholder="Short description shown on the category" /></Field></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} onClick={save} disabled={!form?.name?.trim()}>Save</button>
            <button className={iconBtn} onClick={requestClose}>Cancel</button>
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
                <button className={iconBtn} title="Edit" aria-label={`Edit ${c.name || "category"}`} onClick={() => openForm({ id: c.id, name: c.name, blurb: c.blurb || "", sort_order: c.sort_order || 0, slug: c.slug, query: c.query || "" })}><Ico n="pencil" /></button>
                <button className={iconBtn} title="Delete" aria-label={`Delete ${c.name || "this category"}`} onClick={() => setDelTarget({ id: c.id, name: c.name || "this category" })}><Ico n="trash" /></button>
              </div>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-[#4B5563]">{c.blurb || "No description."}</p>
          </div>
        ))}
        {!rows.length && (
          <div className="rounded-xl border border-dashed border-[#B8C7DD] bg-[#F8FBFF] p-8 lg:col-span-2">
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E7F0FF] text-[#2260D4]"><Ico n="layers" size={22} /></span>
              <div className="min-w-0">
                <h2 className="text-[18px] font-bold text-[#111827]">No custom category labels yet</h2>
                <p className="mt-1 max-w-[58ch] text-[15px] leading-relaxed text-[#475467]">The live marketplace already groups products by category. Add a label only when you need a clearer navigation group or a curated collection for students.</p>
                <button className={`${btnSecondary} mt-4`} onClick={() => setForm({ name: "", blurb: "", sort_order: rows.length })}><Ico n="plus" size={16} /> Add your first label</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {discardOpen && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="This category form has edits that have not been saved. Discard them?"
          confirmLabel="Discard changes"
          danger
          onConfirm={() => { setDiscardOpen(false); setForm(null); setPristine(null); }}
          onClose={() => setDiscardOpen(false)}
        />
      )}
      {delTarget && (
        <ConfirmDialog
          title="Delete category?"
          message={<span>Permanently delete <b>{delTarget.name}</b>? Products keep their data but fall back to the default marketplace grouping.</span>}
          confirmLabel="Delete"
          danger
          busy={delBusy}
          error={delError}
          onConfirm={confirmDelete}
          onClose={() => { if (!delBusy) { setDelTarget(null); setDelError(null); } }}
        />
      )}
    </>
  );
}

function Integrations({ toast }) {
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState(null);
  const [testing, setTesting] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setTesting(true);
    const [s, c] = await Promise.all([loadIntegrationStatus(), loadIntegrationConfig()]);
    setTesting(false);
    if (s.ok) { setStatus(s.status); setErr(null); } else setErr(s.error);
    if (c.ok) setCfg(c.config);
  };
  useEffect(() => { load(); }, []);
  const saveKey = async () => {
    if (!apiKey.trim()) { toast("Paste an API key first", "alert"); return; }
    setSaving(true);
    const r = await saveIntegrationKey(apiKey.trim());
    setSaving(false);
    if (!r.ok) { toast(r.error || "Could not save", "alert"); return; }
    setApiKey("");
    toast(r.message || "API key saved (encrypted)", "check");
    load();
  };
  const connBadge = (c) => ({
    ok: "bg-emerald-100 text-emerald-800", quota_exhausted: "bg-amber-100 text-amber-800",
    invalid_credentials: "bg-red-100 text-red-700", missing_credentials: "bg-gray-100 text-gray-600",
    provider_error: "bg-red-100 text-red-700",
  }[c] || "bg-gray-100 text-gray-600");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#111827]">Integrations</h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">Product-data provider status and a real connection test. Secrets stay server-side; only a masked fingerprint is shown.</p>
        </div>
        <button className={btnPrimary} onClick={load} disabled={testing}>{testing ? "Testing…" : "Run connection test"}</button>
      </div>

      {/* set / rotate the API key (encrypted server-side) */}
      <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6">
        <h2 className="text-[19px] font-bold text-[#111827]">API key</h2>
        <p className="mt-1 text-[15px] text-[#6B7280]">
          Save the Lazada API key here. It is encrypted (AES-256-GCM) and stored server-side. Never shown back in full and never shipped to the browser.
          A new key is used by product searches immediately, no redeploy needed.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[320px] flex-1">
            <Field label="New API key">
              <input
                type="password"
                className={inputCls}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste the Lazada (RapidAPI) key"
                autoComplete="off"
              />
            </Field>
          </div>
          <button className={btnPrimary} onClick={saveKey} disabled={saving || !apiKey.trim()}>
            {saving ? "Saving…" : "Save key"}
          </button>
        </div>
        {cfg && (
          <p className="mt-3 text-[13px] text-[#6B7280]">
            Current: {cfg.configured ? `configured (${cfg.fingerprint}) · source: ${cfg.source}` : `not set · falling back to ${cfg.source}`}
            {cfg.updated_at ? ` · updated ${new Date(cfg.updated_at).toLocaleString()}` : ""}
          </p>
        )}
      </div>

      {err && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-[15px] text-red-700">
          <p>{err} Connection status needs the deployed API; it may be unavailable in a local preview.</p>
          <button onClick={load} className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[14px] font-semibold text-red-700 hover:bg-red-50">Try again</button>
        </div>
      )}

      {status && (
        <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#667085]">Provider</div>
              <div className="mt-1 text-[19px] font-bold text-[#111827]">{status.provider}</div>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${connBadge(status.connection)}`}>{(status.connection || "unknown").replaceAll("_", " ")}</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Connection"><div className="text-[15px] text-[#111827]">{status.message || "N/A"}</div></Field>
            <Field label="API host"><div className="text-[15px] text-[#111827]">{status.apiHost}</div></Field>
            <Field label="Key configured"><div className="text-[15px] text-[#111827]">{status.configured ? `Yes (${status.keyFingerprint})` : "No"}</div></Field>
            <Field label="Requests remaining"><div className="text-[15px] text-[#111827]">{status.requestsRemaining != null ? status.requestsRemaining.toLocaleString() : "N/A"}</div></Field>
          </div>
          <div className="mt-5">
            <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#667085]">Environment variables</div>
            <ul className="mt-2 grid gap-1.5">
              {Object.entries(status.envVars || {}).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between text-[15px]">
                  <span className="mono text-[#344054]">{k}</span>
                  <span className={v ? "text-emerald-600" : "text-[#98A2B3]"}>{v ? "set" : "not set"}</span>
                </li>
              ))}
            </ul>
          </div>
          {status.lastTest && <p className="mt-4 text-[13px] text-[#6B7280]">Last tested: {new Date(status.lastTest).toLocaleString()}</p>}
          <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280]">
            Credentials are deployment environment variables (Vercel → Settings → Environment Variables). They are read server-side only and never exposed to the browser. Update them there, then run the connection test.
          </p>
        </div>
      )}
    </>
  );
}

function Reviews({ rows, loaded }) {
  // read-only: reviews belong to their authors, and the only rule enforced
  // anywhere is the forbidden-words list (applied when the author writes)
  const shown = rows;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[30px] font-bold text-[#111827]">Community reviews</h1>
      </div>
      <p className="mt-1 text-[15px] text-[#6B7280]">Reviews publish automatically. The only rule enforced is the forbidden-words list (see the Forbidden words tab). This page is a read-only view of what members are saying.</p>

      <div className="mt-5 scroll-fade overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#EAECF0]">
              <th className={headCls}>Gadget · Reviewer</th><th className={headCls}>Rating</th><th className={headCls}>Review</th>
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
                  <span className="text-[#344054]">{r.text}</span>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td className={`${cellCls} text-[#6B7280]`} colSpan={3}>No reviews yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-5 text-[13px] text-[#6B7280]">
        Showing {shown.length} reviews from the catalog dataset. Reviews appear on public product pages right away.
      </p>

      {/* reviews belong to their authors: admins can read but never edit,
          delete or unpublish them. The only rule enforced anywhere is the
          forbidden-words list, applied when the author writes. */}
    </>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [err, setErr] = useState("");
  const [reload, setReload] = useState(0);
  const [toast, toastNode] = useToast();
  const { user: me } = useAuth();
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [roleBusy, setRoleBusy] = useState(false);

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
        const j = await r.json().catch(() => null);
        if (!alive) return;
        if (!r.ok || !j) throw new Error(j?.error?.message || "The user service didn’t respond.");
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
  }, [reload]);

  // privilege grants are consequential: confirm first
  const [grantTarget, setGrantTarget] = useState(null);
  const grantAdmin = async (u) => {
    setRoleBusy(true);
    const result = await setUserRole(u.id, true);
    setRoleBusy(false);
    if (!result.ok) { toast(result.error || "Could not update the role", "alert"); return; }
    setUsers((rows) => rows.map((r) => (r.id === u.id ? { ...r, isAdmin: true } : r)));
    toast(`${u.email} is now an admin`);
  };
  const revokeAdmin = async () => {
    if (!revokeTarget) return;
    setRoleBusy(true);
    const result = await setUserRole(revokeTarget.id, false);
    setRoleBusy(false);
    if (!result.ok) { toast(result.error || "Could not update the role", "alert"); return; }
    setUsers((rows) => rows.map((r) => (r.id === revokeTarget.id ? { ...r, isAdmin: false } : r)));
    setRevokeTarget(null);
    toast(`${revokeTarget.email} is no longer an admin`);
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "N/A");
  const initials = (email) => (email || "?").slice(0, 2).toUpperCase();
  const shown = users.filter((u) => `${u.email} ${u.id}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1 className="text-[30px] font-bold text-[#111827]">Users</h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">Real registered accounts from the authentication provider. No demo or seeded users are shown.</p>
      {state === "loading" && <p className="mt-6 text-[15px] text-[#6B7280]">Loading registered users…</p>}
      {state === "error" && (
        <div className="mt-6 rounded-xl border border-[#F5C6C6] bg-[#FEF3F3] p-5 text-[15px] text-[#B42318]">
          <p>Could not load users. {err}</p>
          <button onClick={() => setReload((n) => n + 1)} className="mt-3 rounded-lg border border-[#F5C6C6] bg-white px-3 py-1.5 text-[14px] font-semibold text-[#B42318] hover:bg-[#FEF3F3]">Try again</button>
        </div>
      )}
      {state === "ready" && (
      <>
      <div className="mt-4 text-[14px] text-[#6B7280]">{users.length} registered account{users.length === 1 ? "" : "s"}</div>
      <input className={`${inputCls} mt-4 !w-72`} placeholder="Search by email..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-5 scroll-fade overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-[#EAECF0]">
              <th className={headCls}>Account</th><th className={headCls}>Role</th><th className={headCls}>Registered</th><th className={headCls}>Last sign-in</th>
              <th className={headCls}>Email confirmed</th><th className={`${headCls} text-right`}>Actions</th>
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
                <td className={cellCls}>
                  <Pill kind={u.isAdmin ? "active" : "inactive"}>{u.isAdmin ? "admin" : "user"}</Pill>
                </td>
                <td className={cellCls}>{fmtDate(u.createdAt)}</td>
                <td className={cellCls}>{fmtDate(u.lastSignIn)}</td>
                <td className={cellCls}>
                  <Pill kind={u.confirmed ? "approved" : "pending"}>{u.confirmed ? "confirmed" : "pending"}</Pill>
                </td>
                <td className={`${cellCls} text-right`}>
                  {u.isAdmin ? (
                    me?.id === u.id ? (
                      <span className="text-[13px] text-[#98A2B3]">That's you</span>
                    ) : (
                      <button className={iconBtn} title="Remove admin" aria-label={`Remove admin access from ${u.email}`} disabled={roleBusy} onClick={() => setRevokeTarget(u)}>
                        <Ico n="exit" />
                      </button>
                    )
                  ) : (
                    <button className={iconBtn} title="Make admin" aria-label={`Make ${u.email} an admin`} disabled={roleBusy} onClick={() => setGrantTarget(u)}>
                      <Ico n="user" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td className={`${cellCls} text-[#6B7280]`} colSpan={6}>No users match the search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
      {toastNode}
      {revokeTarget && (
        <Modal
          title="Remove admin access?"
          sub="They will keep their account and reviews, but lose access to the admin console."
          onClose={() => setRevokeTarget(null)}
          actions={
            <>
              <button type="button" className={btnOutline} onClick={() => setRevokeTarget(null)}>Cancel</button>
              <button type="button" className={btnDangerCls} onClick={revokeAdmin} disabled={roleBusy}>
                {roleBusy ? "Removing…" : "Remove admin"}
              </button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-[#475467]">
            You are removing admin access from <b>{revokeTarget.email}</b>. You can grant it again at any time.
          </p>
        </Modal>
      )}
      {grantTarget && (
        <ConfirmDialog
          title="Grant admin access?"
          message={<span>Give <b>{grantTarget.email}</b> full admin access to the console? They will be able to manage products, categories, reviews and settings.</span>}
          confirmLabel="Grant admin"
          busy={roleBusy}
          onConfirm={async () => { const u = grantTarget; setGrantTarget(null); await grantAdmin(u); }}
          onClose={() => { if (!roleBusy) setGrantTarget(null); }}
        />
      )}
    </>
  );
}

function SiteSettings({ toast }) {
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    loadSiteSettings().then((s) => {
      setText(s.announcement || "");
      setEnabled(s.announcement_enabled === "true");
      setLoading(false);
    });
  }, []);
  const save = async () => {
    setSaving(true);
    const first = await saveSiteSetting("announcement", text.trim());
    const second = first.ok ? await saveSiteSetting("announcement_enabled", enabled ? "true" : "false") : first;
    setSaving(false);
    if (!second.ok) { toast(second.error || "Could not save", "alert"); return; }
    setDirty(false);
    toast("Site settings saved. They show on the homepage the next time it loads");
  };
  return (
    <>
      <div className="rounded-2xl border border-[#DCE7F8] bg-[linear-gradient(135deg,#F8FBFF_0%,#EEF5FF_100%)] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2260D4]">Public content</p>
        <h1 className="mt-2 text-[30px] font-bold text-[#111827]">Site settings</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[#475467]">
          A short homepage announcement shown to every visitor. Saved to the database and shown on the
          public homepage the next time it loads. No redeploy needed.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6 text-[15px] text-[#6B7280]">Loading site settings…</div>
      ) : (
        <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white p-6">
          <h2 className="text-[19px] font-bold text-[#111827]">Homepage announcement</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Announcement text">
              <input
                className={inputCls}
                value={text}
                maxLength={180}
                placeholder="e.g. New: compare up to four gadgets side by side"
                onChange={(e) => { setText(e.target.value); setDirty(true); }}
              />
            </Field>
            <label className="flex items-center gap-2.5 text-[15px] text-[#344054]">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => { setEnabled(e.target.checked); setDirty(true); }}
                className="h-4 w-4 rounded accent-[#2260D4]"
              />
              Show this announcement on the public homepage
            </label>
            <div className="flex items-center gap-2">
              <button className={btnPrimary} onClick={save} disabled={saving || !dirty}>
                {saving ? "Saving…" : "Save settings"}
              </button>
              {dirty && <span className="text-[13px] text-[#667085]">Unsaved changes</span>}
            </div>
            <p className="text-[13px] text-[#667085]">
              {enabled && text.trim() ? "Currently live on the homepage." : "Currently hidden from the homepage."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Shell({ tabKey, tab, onOut, children }) {
  const groups = [
    ["overview", [["dashboard", "Dashboard", "dashboard"], ["reports", "Reports", "reports"]]],
    ["catalog", [["gadgets", "Gadgets", "box"], ["categories", "Categories", "layers"]]],
    ["community", [["reviews", "Reviews", "chat"], ["forbidden", "Forbidden words", "shield"]]],
    ["people", [["users", "Users", "user"]]],
    ["system", [["integrations", "Integrations", "plug"], ["site", "Site settings", "star"], ["logs", "Activity Logs", "clock"]]],
    ["session", [["public", "View public site", "home"], ["out", "Sign out", "exit"]]],
  ];
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFB] font-[Inter,ui-sans-serif,system-ui,sans-serif] lg:flex-row">
      <aside className="w-full shrink-0 bg-[#14213A] lg:sticky lg:top-0 lg:h-screen lg:w-[300px] lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <Logo size={17} tone="light" />
          <span className="ml-auto rounded bg-white/15 px-[7px] py-[3px] text-[10px] font-bold tracking-[0.1em] text-white">ADMIN</span>
        </div>
        <hr className="border-white/10" />
        <nav className="scroll-fade flex gap-1 overflow-x-auto px-3 pb-5 pt-3 lg:block lg:space-y-4 lg:overflow-visible">
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
  // unknown ?tab values used to render an empty shell; deep links fall back
  const TAB_KEYS = ["dashboard", "reports", "gadgets", "categories", "forbidden", "reviews", "users", "integrations", "site", "logs"];
  const rawTab = params.get("tab") || "dashboard";
  const tabKey = TAB_KEYS.includes(rawTab) ? rawTab : "dashboard";
  const tab = (t) => setParams({ tab: t });
  // sign-out is consequential: confirm, await the real result, then leave
  const [confirmOut, setConfirmOut] = useState(false);
  const [outBusy, setOutBusy] = useState(false);
  const [outError, setOutError] = useState(null);
  const doSignOut = async () => {
    setOutBusy(true); setOutError(null);
    const res = await signOut().catch((e) => ({ error: e }));
    if (res && res.error) { setOutError("Could not sign out. Please try again."); setOutBusy(false); return; }
    setOutBusy(false); setConfirmOut(false);
    nav("/");
  };
  // Real reviews from the database (never the fixture). Loaded on mount.
  const [reviews, setReviews] = useState([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [toast, toastNode] = useToast();
  const stats = catalogStats(GW.gadgets);

  // loadAllReviews returns raw rows (body/gadget_id/user_id/created_at); map them
  // to the display shape the moderation table renders (text/gadget/user/date).
  const mapReviews = async (rows) => {
    const uniq = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const names = {};
    await Promise.all(uniq.map(async (id) => {
      const p = await getPublicProfile(id).catch(() => null);
      names[id] = p?.display_name || null;
    }));
    return rows.map((r) => ({
      ...r,
      text: r.body ?? "",
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      user: names[r.user_id] || "Member",
      gadget: (GW.getGadget && GW.getGadget(r.gadget_id)?.model) || r.gadget_id,
    }));
  };

  useEffect(() => {
    let alive = true;
    loadAllReviews().then(async (res) => {
      if (!alive) return;
      if (res.ok) setReviews(await mapReviews(res.rows));
      setReviewsLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const reloadReviews = async () => {
    const res = await loadAllReviews();
    if (res.ok) setReviews(await mapReviews(res.rows));
  };

  return (
    <Shell tabKey={tabKey} tab={tab} onOut={() => setConfirmOut(true)}>
      {confirmOut && (
        <ConfirmDialog
          title="Sign out of GadgetWise?"
          message="Are you sure you want to sign out of the admin console?"
          confirmLabel="Sign Out"
          busy={outBusy}
          error={outError}
          onConfirm={doSignOut}
          onClose={() => { if (!outBusy) { setConfirmOut(false); setOutError(null); } }}
        />
      )}
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
      {tabKey === "forbidden" && <ForbiddenWords toast={toast} />}
      {tabKey === "integrations" && <Integrations toast={toast} />}
      {tabKey === "site" && <SiteSettings toast={toast} />}
      {tabKey === "logs" && <ActivityLogs />}
      {toastNode}
    </Shell>
  );
}

// Forbidden words: the moderation list behind review validation. Edits are
// live immediately - the DB trigger reads this table on every review write.
function ForbiddenWords({ toast }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState(null); // {id?, phrase, category, enabled}
  const [err, setErr] = useState(null); // {field, msg}
  const fail = (field, msg) => { setErr({ field, msg }); focusField("#" + field); };
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState(null);
  const reload = async () => {
    const r = await loadForbiddenWords();
    if (r.ok) setRows(r.rows);
    setLoaded(true);
  };
  useEffect(() => { reload(); }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const res = await saveForbiddenWord(form);
    setSaving(false);
    if (!res.ok) { fail("fw-phrase", res.error || "Could not save the entry."); return; }
    setForm(null);
    reload();
    toast(form.id ? "Entry updated" : "Entry added");
  };

  const shown = rows.filter((r) => {
    if (status === "enabled" && !r.enabled) return false;
    if (status === "disabled" && r.enabled) return false;
    if (q && !(`${r.phrase} ${r.category}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2260D4]">Moderation</p>
          <h1 className="mt-2 text-[30px] font-bold text-[#111827]">Forbidden words</h1>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[#475467]">
            Reviews containing an enabled entry are rejected before they save. Matching is case-insensitive,
            ignores punctuation and spacing differences, and only whole words count. A listed word never
            blocks innocent words around it. Changes apply immediately.
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setForm({ phrase: "", category: "general", enabled: true })}>
          <Ico n="plus" size={16} /> Add entry
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input className={fieldInputCls + " max-w-xs !py-2"} placeholder="Search entries…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search forbidden words" />
        <select className={fieldInputCls + " max-w-[12rem] !py-2"} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All entries</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <span className="text-sm text-[#667085]">{shown.length} of {rows.length}</span>
      </div>

      {form && (
        <Modal
          title={form.id ? "Edit entry" : "Add forbidden entry"}
          onClose={() => setForm(null)}
          actions={<>
            <button className={btnOutlineCls} onClick={() => setForm(null)}>Cancel</button>
            <button className={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </>}
        >
          <div>
            <label className={fieldLabelCls} htmlFor="fw-phrase">Word or phrase</label>
            <input id="fw-phrase" className={fieldInputCls} value={form.phrase} maxLength={80}
              onChange={(e) => { setForm({ ...form, phrase: e.target.value }); setErr(null); }} placeholder="e.g. spam link"
              aria-invalid={err?.field === "fw-phrase" ? "true" : undefined}
              aria-describedby={err?.field === "fw-phrase" ? "fw-phrase-error" : undefined} />
            {err?.field === "fw-phrase" && <FieldError id="fw-phrase">{err.msg}</FieldError>}
            <p className="mt-1 text-xs text-[#667085]">Case and punctuation are ignored when matching. Max 80 characters.</p>
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="fw-cat">Category</label>
            <select id="fw-cat" className={fieldInputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="general">General</option>
              <option value="profanity">Profanity</option>
              <option value="harassment">Harassment</option>
              <option value="slurs">Slurs</option>
              <option value="spam">Spam</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#344054]">
            <input type="checkbox" checked={form.enabled !== false} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Enabled (enforced on reviews)
          </label>
        </Modal>
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete this entry?"
          message={<span>Remove <b>{delTarget.phrase}</b> from the moderation list? Reviews containing it will no longer be rejected.</span>}
          confirmLabel="Delete"
          danger
          busy={delBusy}
          error={delError}
          onConfirm={async () => {
            setDelBusy(true); setDelError(null);
            const res = await deleteForbiddenWord(delTarget.id);
            setDelBusy(false);
            if (!res.ok) { setDelError(res.error || "Could not delete"); return; }
            setDelTarget(null);
            reload();
            toast("Entry deleted", "trash");
          }}
          onClose={() => { if (!delBusy) { setDelTarget(null); setDelError(null); } }}
        />
      )}

      {!loaded ? (
        <p className="mt-8 text-[#667085]">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#B8C7DD] bg-[#F8FBFF] p-8 text-center">
          <p className="text-[17px] font-semibold text-[#111827]">{rows.length ? "No entries match this filter" : "No forbidden words yet"}</p>
          <p className="mt-1 text-[15px] text-[#475467]">Add a word or phrase to start moderating reviews.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white">
          <table className="w-full text-left text-[14px]">
            <thead><tr>
              <th className={headCls}>Phrase</th>
              <th className={headCls}>Category</th>
              <th className={headCls}>Status</th>
              <th className={headCls + " text-right"}>Actions</th>
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className={cellCls + " font-medium text-[#111827]"}>{r.phrase}</td>
                  <td className={cellCls}><Pill kind="neutral">{r.category}</Pill></td>
                  <td className={cellCls}>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await setForbiddenWordEnabled(r.id, !r.enabled);
                        if (res.ok) { reload(); toast(r.enabled ? "Entry disabled" : "Entry enabled"); }
                        else toast(res.error || "Could not update", "alert");
                      }}
                      className={r.enabled ? "chip-blue cursor-pointer border border-[#2260D4]" : "chip cursor-pointer border border-[#D9DEE7] text-[#98A2B3]"}
                      aria-pressed={r.enabled}
                    >
                      {r.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className={cellCls}>
                    <div className="flex justify-end gap-2">
                      <button className={iconBtn} title="Edit" aria-label={`Edit ${r.phrase}`} onClick={() => setForm({ id: r.id, phrase: r.phrase, category: r.category, enabled: r.enabled })}><Ico n="pencil" /></button>
                      <button className={iconBtn} title="Delete" aria-label={`Delete ${r.phrase}`} onClick={() => setDelTarget(r)}><Ico n="trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Activity log: append-only trail of privileged and moderation events.
function ActivityLogs() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [result, setResult] = useState("");
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const limit = 25;

  const reload = async (off = 0) => {
    setState("loading");
    setError("");
    const r = await loadActivityLog({ q, result, action, limit, offset: off });
    if (!r.ok) { setState("error"); setError(r.error || "Could not load the log"); return; }
    setRows(r.rows);
    setTotal(r.total);
    setOffset(off);
    setState("ready");
  };
  useEffect(() => { reload(0); }, []);

  const resultColor = (res) =>
    res === "success" ? "bg-[#E7F6EC] text-[#1E7A3C]"
      : res === "rejected" ? "bg-[#FFF4E5] text-[#8A5A00]"
        : "bg-[#FDECEC] text-[#B42318]";

  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2260D4]">System</p>
        <h1 className="mt-2 text-[30px] font-bold text-[#111827]">Activity logs</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[#475467]">
          Append-only record of privileged actions and moderation outcomes. Entries are written by the
          server with the real actor. They cannot be edited or deleted from the app.
        </p>
      </div>

      <form className="mt-5 flex flex-wrap items-center gap-3" onSubmit={(e) => { e.preventDefault(); reload(0); }}>
        <input className={fieldInputCls + " max-w-xs !py-2"} placeholder="Search actor, action, record id…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activity log" />
        <input className={fieldInputCls + " max-w-xs !py-2"} placeholder="Action (e.g. review, forbidden)" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action" />
        <select className={fieldInputCls + " max-w-[11rem] !py-2"} value={result} onChange={(e) => setResult(e.target.value)} aria-label="Filter by result">
          <option value="">All results</option>
          <option value="success">Success</option>
          <option value="rejected">Rejected</option>
          <option value="denied">Denied</option>
          <option value="failure">Failure</option>
        </select>
        <button type="submit" className={btnPrimary}>Search</button>
      </form>

      {state === "loading" ? (
        <p className="mt-8 text-[#667085]">Loading…</p>
      ) : state === "error" ? (
        <div className="mt-8 rounded-xl border border-[#F5C2C0] bg-[#FDF3F2] p-6">
          <p className="text-[15px] text-[#B42318]">{error}</p>
          <button className={btnOutlineCls + " mt-3"} onClick={() => reload(0)}>Try again</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#B8C7DD] bg-[#F8FBFF] p-8 text-center">
          <p className="text-[17px] font-semibold text-[#111827]">No events found</p>
          <p className="mt-1 text-[15px] text-[#475467]">Actions like review submissions and moderation changes appear here.</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-[#667085]">{total} event{total === 1 ? "" : "s"} · newest first</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white">
            <table className="w-full text-left text-[14px]">
              <thead><tr>
                <th className={headCls}>When</th>
                <th className={headCls}>Actor</th>
                <th className={headCls}>Action</th>
                <th className={headCls}>Record</th>
                <th className={headCls}>Result</th>
                <th className={headCls}>Reason</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-[#F8FAFF]" onClick={() => setDetail(r)}>
                    <td className={cellCls + " whitespace-nowrap"}>{new Date(r.at).toLocaleString()}</td>
                    <td className={cellCls}>{r.actor || "system"}</td>
                    <td className={cellCls + " font-medium text-[#111827]"}>{r.action}</td>
                    <td className={cellCls}>{r.entity_type ? `${r.entity_type}${r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}` : "N/A"}</td>
                    <td className={cellCls}><span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + resultColor(r.result)}>{r.result}</span></td>
                    <td className={cellCls + " text-[#667085]"}>{r.reason || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button className={btnOutlineCls} disabled={offset === 0} onClick={() => reload(Math.max(0, offset - limit))}>Previous</button>
            <span className="text-sm text-[#667085]">{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
            <button className={btnOutlineCls} disabled={offset + limit >= total} onClick={() => reload(offset + limit)}>Next</button>
          </div>
        </>
      )}

      {detail && (
        <Modal title="Event details" onClose={() => setDetail(null)} actions={<button className={btnPrimary} onClick={() => setDetail(null)}>Close</button>}>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="font-semibold text-[#344054]">When</dt><dd className="text-[#111827]">{new Date(detail.at).toLocaleString()}</dd>
            <dt className="font-semibold text-[#344054]">Actor</dt><dd className="text-[#111827]">{detail.actor || "system"}</dd>
            <dt className="font-semibold text-[#344054]">Action</dt><dd className="text-[#111827]">{detail.action}</dd>
            <dt className="font-semibold text-[#344054]">Record</dt><dd className="text-[#111827]">{detail.entity_type || "N/A"} {detail.entity_id || ""}</dd>
            <dt className="font-semibold text-[#344054]">Result</dt><dd className="text-[#111827]">{detail.result}</dd>
            <dt className="font-semibold text-[#344054]">Reason</dt><dd className="text-[#111827]">{detail.reason || "N/A"}</dd>
            <dt className="font-semibold text-[#344054]">Metadata</dt>
            <dd className="text-[#111827]"><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(detail.metadata || {}, null, 2)}</pre></dd>
          </dl>
        </Modal>
      )}
    </div>
  );
}
