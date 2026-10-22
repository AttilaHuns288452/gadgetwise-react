import { GW } from "../lib.js";
import { supabase, supabaseConfigured } from "./supabase.js";

function replaceContents(target, items) {
  if (!Array.isArray(target)) return;
  target.splice(0, target.length, ...items);
}

function reviewToLegacy(review) {
  return {
    id: review.id,
    user: "GadgetWise member",
    rating: Number(review.rating),
    date: review.created_at || "",
    context: "",
    text: review.body || "",
  };
}

function normalizeGadget(row) {
  const metadata = row.legacy_data && typeof row.legacy_data === "object" ? row.legacy_data : {};
  const specs = row.specs && typeof row.specs === "object" ? row.specs : (metadata.specs || {});
  const reviews = (Array.isArray(row.reviews) ? row.reviews : [])
    .filter((review) => review && review.status === "approved")
    .map(reviewToLegacy);
  const rating = reviews.length
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
    : 0;
  const image = row.image_url || metadata.image || metadata.img || "";
  return {
    ...metadata,
    id: row.id,
    brand: row.brand,
    model: row.model,
    category: row.category_id,
    price: Number(row.price),
    releaseYear: row.release_year || metadata.releaseYear || null,
    status: "published",
    image,
    img: image,
    tagline: metadata.tagline || "",
    summary: row.summary || metadata.summary || "",
    specs,
    specList: Object.entries(specs).map(([key, value]) => key + ": " + String(value)),
    scored: row.scored && Object.keys(row.scored).length ? row.scored : (metadata.scored || {}),
    value: row.value_data && Object.keys(row.value_data).length ? row.value_data : (metadata.value || {}),
    battery: row.battery_hours == null ? (metadata.battery || 0) : Number(row.battery_hours),
    rating,
    reviewCount: reviews.length,
    reviews,
    issues: Array.isArray(metadata.issues) ? metadata.issues : [],
    dataSource: row.data_source || "unverified",
    sourceUrl: row.source_url || null,
    priceVerifiedAt: row.price_verified_at || null,
  };
}

export function clearRuntimeCatalog() {
  replaceContents(GW.gadgets, []);
  if (Array.isArray(GW.categories)) replaceContents(GW.categories, []);
}

export async function loadPublishedCatalog() {
  if (!supabaseConfigured || !supabase) {
    return { status: "demo", count: GW.gadgets.length };
  }

  const [categoryResult, gadgetResult] = await Promise.all([
    supabase.from("categories").select("id,name,description,file,is_published").eq("is_published", true).order("name"),
    supabase.from("gadgets")
      .select("id,category_id,brand,model,price,release_year,image_url,summary,specs,scored,value_data,legacy_data,battery_hours,data_source,source_url,price_verified_at,reviews(id,rating,body,status,created_at)")
      .eq("is_published", true).order("brand"),
  ]);

  if (categoryResult.error) throw new Error("Catalog categories could not be loaded. Check the Supabase migration and RLS policies.");
  if (gadgetResult.error) throw new Error("Catalog products could not be loaded. Check the Supabase migration and RLS policies.");

  const categoryRows = (categoryResult.data || []).map((row) => ({
    id: row.id, name: row.name, blurb: row.description || "", desc: row.description || "", file: row.file || row.id,
  }));
  const gadgets = (gadgetResult.data || []).map(normalizeGadget);

  replaceContents(GW.categories, categoryRows);
  replaceContents(GW.gadgets, gadgets);
  return { status: gadgets.length ? "live" : "empty", count: gadgets.length };
}
