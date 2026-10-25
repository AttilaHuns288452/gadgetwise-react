// Data schema and deterministic helpers only. Products come from the real
// loader (lib/catalog.js) at runtime; the fictional fixture is test-only.
const GW = {};

GW.categories = [
  { id: "smartphones", name: "Smartphones",   blurb: "Everyday drivers, campus workhorses, and camera-first picks.", file: "ph-smartphone" },
  { id: "laptops",     name: "Laptops",       blurb: "From note-taking ultrabooks to programming and editing rigs.", file: "ph-laptop" },
  { id: "tablets",     name: "Tablets",       blurb: "Light readers, note-takers, and portable media screens.",   file: "ph-tablet" },
  { id: "headphones",  name: "Headphones",    blurb: "Focus on lectures, commutes, and late-night study.",        file: "ph-headphones" },
  { id: "powerbanks",  name: "Power Banks",   blurb: "Outlast brownouts, long commutes, and full class days.",    file: "ph-powerbank" },
  { id: "smartwatches",name: "Smartwatches",  blurb: "Trackers and watchfaces that survive a student schedule.",  file: "ph-watch" }
];

GW.gadgets = [];  // populated by the real marketplace loader (lib/catalog.js)

GW.budgetBands = [
  { id: "under-10k", label: "Under ₱10,000",       min: 0,     max: 10000 },
  { id: "10-20k",    label: "₱10,000 – ₱20,000",   min: 10000, max: 20000 },
  { id: "20-40k",    label: "₱20,000 – ₱40,000",   min: 20000, max: 40000 },
  { id: "40-60k",    label: "₱40,000 – ₱60,000",   min: 40000, max: 60000 },
  { id: "60k-plus",  label: "₱60,000 and above",   min: 60000, max: Infinity }
];

GW.useCases = [
  { id: "general",       label: "General Student Use", categories: ["smartphones", "laptops", "tablets"],
    note: "Browsing, documents, video calls, and media.",
    criteria: { performance: 3, battery: 3, portability: 2, display: 2, storage: 1, camera: 1 } },
  { id: "programming",   label: "Programming", categories: ["laptops"],
    note: "IDEs, compilers, virtual machines, long compile cycles.",
    criteria: { performance: 5, storage: 3, display: 3, battery: 2, portability: 2 } },
  { id: "online-classes",label: "Online Classes", categories: ["smartphones", "tablets", "laptops"],
    note: "Video calls, lecture playback, note-taking from home.",
    criteria: { battery: 4, display: 3, performance: 2, camera: 2, storage: 2, portability: 1 } },
  { id: "office",        label: "Office / Productivity", categories: ["laptops", "tablets"],
    note: "Documents, spreadsheets, presentations, email.",
    criteria: { performance: 3, battery: 4, portability: 3, display: 2, storage: 2 } },
  { id: "graphic-design",label: "Graphic Design", categories: ["laptops", "tablets"],
    note: "Illustration, layout, color-accurate work, pen input.",
    criteria: { display: 5, performance: 4, storage: 3, portability: 2, battery: 1 } },
  { id: "video-editing", label: "Video Editing", categories: ["laptops", "smartphones"],
    note: "Timeline editing, rendering, color grading, large files.",
    criteria: { performance: 5, storage: 4, display: 3, battery: 1, portability: 1 } }
];

GW.priorityFactors = [
  { id: "performance",   label: "Performance",    base: 15, hint: "Processor, RAM, sustained speed" },
  { id: "battery",       label: "Battery Life",   base: 10, hint: "Hours per charge or unplugged" },
  { id: "portability",   label: "Portability",    base: 0,  hint: "Weight and size for commuting" },
  { id: "display",       label: "Display",        base: 0,  hint: "Panel quality, brightness, size" },
  { id: "camera",        label: "Camera",         base: 0,  hint: "Photo and video capture" },
  { id: "storage",       label: "Storage",        base: 0,  hint: "Space for files, apps, projects" },
  { id: "value",         label: "Long-term Value",base: 10, hint: "Lower monthly cost for the same lifespan" },
  { id: "budget",        label: "Budget discipline", base: 0, hint: "How strictly to stay under your ceiling" }
];

// ponytail: resolver hook so marketplace (live Lazada) listings resolve by id

// without data.js importing marketplace.js (avoids a cycle). Set by

// marketplace.js at module init.

GW.listingResolver = null;

GW.getGadget = function (id) {
  const hit = GW.gadgets.find(g => g.id === id);
  if (hit) return hit;
  return GW.listingResolver ? GW.listingResolver(id) : null;
};

GW.getCategory = function (id) {
  const found = GW.categories.find((c) => c.id === id);
  // Never null: every caller renders .name straight off this lookup, and an
  // incomplete listing (missing or unknown category) used to blank whole pages.
  return found || { id: id || "", name: id ? String(id) : "Other" };
};

GW.gadgetsInCategory = function (catId) { return GW.gadgets.filter(g => g.category === catId); };

GW.gadgetsByIds = function (ids) { return ids.map(GW.getGadget).filter(Boolean); };

/* Cost per month (spec 18): price spread over a 36-month usage window —

   a fixed, documented assumption for ALL gadgets (comparable within
   category), not a per-product lifespan invention. */

GW.MONTHS_WINDOW = 36;

GW.monthlyCost = function (g) {
  return g.price / GW.MONTHS_WINDOW;
};

GW.categoryMedianMonthly = function (catId) {
  const list = GW.gadgetsInCategory(catId).map(GW.monthlyCost).sort((a, b) => a - b);
  if (!list.length) return 0;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
};

/* Some models already start with the brand ("Acer Aspire 5") — avoid "Acer Acer Aspire 5".

   Canonical name builder: moderation rows and the UI both route through this. */

// listing titles carry seller noise (promo stamps, doubled brands); display
// cleanup only — the stored model string is never touched
const PROMO_TAG = /\(\s*(new|hot|sale|promo|free|best|original|authentic|ready|stock|top|wow|limited|best\s*seller)[^)]*\)/gi;
GW.cleanTitle = (s) => {
  const cleaned = String(s || "")
    .replace(/[（]/g, "(").replace(/[）]/g, ")")
    .replace(PROMO_TAG, " ")
    // seller feature spam after a pipe ("HONOR X7e | Water & Drop Resistant...")
    // is not part of the product name
    .split("|")[0]
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(s || "").replace(/\s+/g, " ").trim();
};

GW.displayName = (g) => {
  const rawBrand = String(g.brand || "").trim();
  // marketplace placeholders are not a brand: prefixing "Unknown" onto a
  // listing title reads as broken data, not as information
  const placeholder = /^(unknown|no brand|n\/a|none)$/i.test(rawBrand);
  const brand = placeholder ? "" : rawBrand;
  const model = GW.cleanTitle(g.model);
  if (!model) return g.model;
  if (!brand) return model;
  return model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`.trim();
};

export default GW;
