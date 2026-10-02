import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GW, ownIndex } from "../lib.js";
import { GadgetCard } from "../components/ui.jsx";

function Catalog({ compare, onCompare }) {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const cat = searchParams.get("cat") || "";
  const [sort, setSort] = useState("index");

  const list = useMemo(() => {
    let out = GW.gadgets.filter((g) => (!cat || g.category === cat));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter((g) =>
        [g.brand, g.model, g.category, g.tagline, ...g.strengths].join(" ").toLowerCase().includes(needle)
      );
    }
    const by = {
      index: (a, b) => ownIndex(b) - ownIndex(a),
      priceUp: (a, b) => a.price - b.price,
      priceDown: (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      monthly: (a, b) => GW.monthlyCost(a) - GW.monthlyCost(b),
    }[sort];
    return [...out].sort(by);
  }, [q, cat, sort]);

  return (
    <section className="section">
      <div className="eyebrow">Catalog</div>
      <h1 className="mt-2">{cat ? GW.getCategory(cat).name : "All gadgets"}</h1>
      <p className="mt-2 text-ink2">
        {list.length} gadget{list.length === 1 ? "" : "s"} · specs and prices are illustrative demo data ·
        Performance to Cost index on every card
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search gadgets, brands, categories…"
          aria-label="Search gadgets"
          className="field min-w-[12rem] flex-1"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort gadgets" className="field max-w-[14rem]">
          <option value="index">Best Performance to Cost</option>
          <option value="monthly">Lowest cost per month</option>
          <option value="priceUp">Price: low to high</option>
          <option value="priceDown">Price: high to low</option>
          <option value="rating">Highest rated</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/gadgets" className={`chip !px-3 !py-1.5 ${!cat ? "bg-primary text-white" : "chip-neutral hover:border-primary"}`}>All</Link>
        {GW.categories.map((c) => (
          <Link key={c.id} to={`/gadgets?cat=${c.id}`}
            className={`chip !px-3 !py-1.5 ${cat === c.id ? "bg-primary text-white" : "chip-neutral hover:border-primary"}`}>
            {c.name}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-ink2">
          No gadgets match “{q}”. Try a different search or clear the filters.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g) => (
            <GadgetCard key={g.id} g={g} compare={compare} onCompare={onCompare} />
          ))}
        </div>
      )}
    </section>
  );
}

export default Catalog;
