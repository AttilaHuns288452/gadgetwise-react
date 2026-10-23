import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GW, money, ownIndex } from '../lib.js';
import { Img, Stars, GadgetCard, btnPrimaryCls, btnOutlineCls, CatalogErrorCard, CatalogLoadingCard, useReveal } from '../components/ui.jsx';
import ParetoExplorer from '../components/ParetoExplorer.jsx';

function Hero() {
  // Real catalog: feature the top-rated real product with an image. Falls back
  // to any product, and renders nothing if the catalog is still empty.
  const g =
    [...GW.gadgets].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
  return (
    <section className="bg-hero text-on-hero">
      <div className="mx-auto grid max-w-none items-stretch gap-10 px-6 lg:px-12 2xl:px-16 py-12 md:py-14 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-w-0 flex-col justify-center">
          <h1 className="anim-fade-up font-display text-[clamp(38px,5vw,68px)] font-bold leading-[1.02] tracking-tight">
            Find the right gadget for <span className="text-star">school.</span>
          </h1>
          <p className="anim-fade-up mt-6 max-w-[54ch] text-xl leading-relaxed text-on-hero2" style={{ animationDelay: "80ms" }}>
            Compare <strong className="font-semibold text-white">verified specifications, monthly costs, and student priorities</strong> before you buy — with recommendations whose scoring you can actually read.
          </p>
          <div className="anim-fade-up mt-7 flex flex-wrap gap-3" style={{ animationDelay: "160ms" }}>
            <Link to="/recommend" className={btnPrimaryCls}>Find my gadget</Link>
            <Link to="/gadgets" className="rounded-lg border border-white/70 px-7 py-2.5 text-base font-semibold text-white transition-colors hover:bg-white/10">Browse gadgets</Link>
          </div>
          <ul className="mt-9 grid gap-3 text-base text-on-hero2 sm:grid-cols-3">
            {['Ownership cost on every tag', 'Warranty & repair paths surfaced', 'Scores show their math'].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7fb0ec" strokeWidth="2" className="mt-[3px] shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12.5l2.5 2.5 5-5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        {g && (
          <div className="card overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="relative">
              <span className="absolute left-4 top-4 z-10 rounded-full bg-[#FBF5E7] px-3 py-1 text-xs font-semibold text-star">Student favorite</span>
              <Img gadget={g} className="w-full" imgClass="object-cover" eager />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <p className="font-display text-lg font-bold text-ink">{g.model}</p>
              <p className="mono text-xl font-bold text-ink">{money(g.price)}</p>
            </div>
            <div className="mt-4 flex items-center gap-3 bg-primary-wash px-5 py-3">
              <span className="mono text-2xl font-bold text-hero">{ownIndex(g)}</span>
              <span className="text-sm font-medium text-ink2">Performance to Cost</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Stats() {
  const n = GW.gadgets.length;
  const reviews = GW.gadgets.reduce((s, g) => s + g.reviewCount, 0);
  const avg = (GW.gadgets.reduce((s, g) => s + g.rating, 0) / Math.max(1, n)).toFixed(1);
  const cells = [
    [String(n), 'gadgets tracked'],
    [reviews ? `${reviews.toLocaleString('en-US')}+` : 'No ratings', reviews ? 'student reviews' : 'student reviews yet'],
    [reviews ? `${avg}★` : 'No ratings', 'average catalog rating'],
    [String(GW.categories.length), 'categories covered'],
  ];
  return (
    <section className="border-y border-line bg-surface2">
      <div className="mx-auto grid max-w-none grid-cols-2 gap-y-4 px-6 lg:px-12 2xl:px-16 py-7 md:grid-cols-4">
        {cells.map(([num, label], i) => (
          <p key={label} className={'text-xs text-ink3' + (i % 2 === 1 ? ' md:border-l md:border-line-strong md:pl-6' : '') + (i === 2 ? ' md:border-l md:border-line-strong md:pl-6' : '')}>
            <span className="mono mr-1.5 block text-2xl font-bold text-hero md:inline">{num}</span>
            {label}
          </p>
        ))}
      </div>
    </section>
  );
}

const CAT_ICONS = {
  smartphones: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M10.5 18h3" strokeLinecap="round" /></>,
  laptops: <><rect x="4" y="5" width="16" height="10" rx="1.5" /><path d="M2.5 18.5h19" strokeLinecap="round" /></>,
  tablets: <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M10.5 18h3" strokeLinecap="round" /></>,
  headphones: <><path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" /><rect x="3.5" y="13.5" width="4" height="6.5" rx="2" /><rect x="16.5" y="13.5" width="4" height="6.5" rx="2" /></>,
  powerbanks: <><rect x="7" y="5" width="10" height="16" rx="2" /><path d="M10.5 3h3v2h-3zM10 12.5l4-2.5-2 5.5 3-3" strokeLinecap="round" strokeLinejoin="round" /></>,
  smartwatches: <><rect x="7" y="7" width="10" height="10" rx="2.5" /><path d="M9.5 7V4.5h5V7M9.5 17v2.5h5V17" strokeLinecap="round" /></>,
};

function Categories() {
  return (
    <section className="mx-auto max-w-none px-6 lg:px-12 2xl:px-16 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">Start with what you need</h2>
          <p className="mt-2 max-w-[62ch] text-base text-ink2">Six categories, each with real specs, warranty and repair paths, and a monthly cost estimate.</p>
        </div>
        <Link to="/gadgets" className={btnOutlineCls + ' rounded-full'}>All gadgets →</Link>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GW.categories.map((c) => {
          const n = GW.gadgetsInCategory(c.id).length;
          return (
            <Link key={c.id} to={`/gadgets?cat=${c.id}`} className="card p-6 transition-colors hover:border-primary">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong text-primary">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{CAT_ICONS[c.id]}</svg>
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{c.name}</h3>
              <p className="mt-1 text-sm text-ink3">{n} gadgets</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const MISS = [
  ['₱ / month', 'Not just the sticker price', 'Price ÷ fixed 36-month window — the same math for every gadget, so numbers compare fairly.'],
  ['Repair path', 'What happens after something breaks', 'Every catalog entry names its repair path — standard upgradeable slots to authorized service only.'],
  ['Academic fit', 'What actually works for your course or workflow', 'Programming, design, online classes: the ranking adjusts to your use.'],
];

function Miss() {
  return (
    <section className="mx-auto max-w-none px-6 lg:px-12 2xl:px-16 pb-14">
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">What students usually miss</h2>
      <p className="mt-2 text-base text-ink2">Three things most price lists leave out.</p>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {MISS.map(([head, label, body]) => (
          <div key={head} className="min-w-0">
            <h3 className="font-display text-xl font-bold text-hero">{head}</h3>
            <p className="mt-2 font-semibold text-ink">{label}</p>
            <p className="mt-2 text-base leading-relaxed text-ink2">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopRated({ compare, onCompare }) {
  const top = [...GW.gadgets].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount).slice(0, 3);
  return (
    <section className="mx-auto max-w-none px-6 lg:px-12 2xl:px-16 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">Top rated by students</h2>
          <p className="mt-2 max-w-[62ch] text-base text-ink2">The three highest rated gadgets in the catalog, ranked from student ratings and reviews.</p>
        </div>
        <Link to="/gadgets" className={btnOutlineCls + ' rounded-full'}>See all rankings</Link>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {top.map((g) => <GadgetCard key={g.id} g={g} compare={compare} onCompare={onCompare} />)}
      </div>
    </section>
  );
}

function Cheapest() {
  const rows = [...GW.gadgets].sort((a, b) => GW.monthlyCost(a) - GW.monthlyCost(b)).slice(0, 3);
  return (
    <section className="mx-auto max-w-none px-6 lg:px-12 2xl:px-16 pb-14">
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">Cheapest to own</h2>
          <p className="mt-2 text-base text-ink2">The three cheapest gadgets to own per month.</p>
          <p className="mono mt-1 text-sm text-ink3">Ranked by monthly cost — lowest first.</p>
        </div>
        <ul>
        {rows.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-4 border-b border-line py-5 last:border-b-0">
            <Img gadget={g} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line" imgClass="object-cover" frame="1 / 1" />
            <div className="min-w-0 flex-1">
              <Link to={'/g/' + g.id} className="break-words text-lg font-semibold text-primary hover:underline">{GW.displayName(g)}</Link>
              <div className="mt-1"><Stars rating={g.rating} count={g.reviewCount} /></div>
            </div>
            <div className="ml-auto shrink-0 text-right">
              <p className="text-base font-semibold text-ink">{money(g.price)}</p>
              <p className="mono mt-1 text-xl font-bold text-primary">≈ {money(GW.monthlyCost(g))}/month</p>
            </div>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}

const STEPS = [
  ['01', 'Discover', 'Browse six categories with honest specs and monthly costs.'],
  ['02', 'Evaluate', 'Open a gadget: warranty, repair path, issues, reviews.'],
  ['03', 'Compare', 'Up to four side by side, with real differences highlighted.'],
  ['04', 'Recommend', 'Four questions in, a ranked shortlist with its math shown.'],
  ['05', 'Save', 'Keep contenders on your wishlist while you decide.'],
];

function Steps() {
  return (
    <section className="border-y border-line bg-surface2">
      <div className="mx-auto grid max-w-none grid-cols-1 gap-y-8 px-6 lg:px-12 2xl:px-16 py-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-y-0">
        {STEPS.map(([n, t, d], i) => (
          <div key={n} className={'min-w-0' + (i > 0 ? ' lg:border-l lg:border-line-strong lg:pl-6' : '')}>
            <p className="mono text-2xl font-bold text-primary">{n}</p>
            <p className="mt-1.5 font-display text-lg font-bold text-ink">{t}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink2">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-none px-6 lg:px-12 2xl:px-16 py-14">
      <div className="flex flex-col gap-6 rounded-2xl border-l-4 border-gold-hair bg-hero px-6 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="min-w-0">
          <h2 className="font-display text-[24px] font-bold tracking-tight text-white md:text-2xl">Not sure which one?</h2>
          <p className="mt-2 text-base text-on-hero2">Four questions. A ranked shortlist. Every score shows its math.</p>
        </div>
        <Link to="/recommend" className="shrink-0 rounded-lg bg-white px-7 py-2.5 text-base font-semibold text-hero transition-colors hover:bg-on-hero">Find my gadget →</Link>
      </div>
    </section>
  );
}

export default function Home({ compare, onCompare, catalogError, catalogLoading }) {
  useReveal();
  return (
    <>
      <Hero />
      {catalogLoading ? (
        <CatalogLoadingCard />
      ) : catalogError ? (
        <CatalogErrorCard />
      ) : (
        <>
          <div className="reveal"><Stats /></div>
          <div className="reveal"><Categories /></div>
          <div className="reveal"><Miss /></div>
          <div className="reveal"><TopRated compare={compare} onCompare={onCompare} /></div>
          <section className="mx-auto max-w-none px-6 lg:px-12 2xl:px-16 pb-14">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">Explore trade-offs</h2>
            <p className="mt-2 max-w-[62ch] text-base text-ink2">
              Pick two objectives and filter. The amber line is the <b>Pareto frontier</b>: nothing beats those products on both axes at once. Click any dot for details.
            </p>
            <div className="mt-6"><ParetoExplorer /></div>
          </section>
          <div className="reveal"><Cheapest /></div>
        </>
      )}
      <div className="reveal"><Steps /></div>
      <div className="reveal"><CTA /></div>
    </>
  );
}
