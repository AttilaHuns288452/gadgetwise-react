import { Link } from "react-router-dom";
import { GW, money, ownIndex } from "../lib.js";
import { Img, Stars, displayName } from "../components/ui.jsx";

function Compare({ compare, onCompare }) {
  const list = GW.gadgetsByIds([...compare]);
  const bestMonthly = list.length ? Math.min(...list.map(GW.monthlyCost)) : null;
  const bestIdx = list.length ? Math.max(...list.map(ownIndex)) : null;

  const rows = [
    ["Price", (g) => <span className="mono">{money(g.price)}</span>],
    ["Cost per month", (g) => (
      <span className="mono">
        {money(GW.monthlyCost(g))}
        {GW.monthlyCost(g) === bestMonthly && list.length > 1 && <span className="chip-good ml-2">Lowest</span>}
      </span>
    )],
    ["Performance to Cost", (g) => (
      <span className="mono">
        {ownIndex(g)}
        {ownIndex(g) === bestIdx && list.length > 1 && <span className="chip-good ml-2">Highest</span>}
      </span>
    )],
    ["Rating", (g) => <Stars rating={g.rating} count={g.reviewCount} />],
    ["Battery life", (g) => <span className="mono">{g.battery} h</span>],
    ["Warranty", (g) => <span className="mono">{g.value.warrantyYears} y</span>],
    ["Repairability", (g) => g.value.repairabilityLabel],
    ["Performance", (g) => <span className="mono">{g.scored.performance} / 10</span>],
    ["Display", (g) => <span className="mono">{g.scored.display} / 10</span>],
    ["Storage", (g) => <span className="mono">{g.scored.storage} / 10</span>],
    ["Strengths", (g) => g.strengths.join(" · ")],
    ["Weaknesses", (g) => g.weaknesses.join(" · ")],
  ];

  return (
    <section className="section">
      <div className="eyebrow">Compare</div>
      <h1 className="mt-2">Side-by-side comparison</h1>
      <p className="mt-2 text-ink2">Pick up to 4 gadgets. Same formulas as every other page.</p>

      {list.length === 0 ? (
        <div className="card mx-auto mt-8 max-w-2xl p-10 text-center">
          <p className="text-ink2">Nothing to compare yet.</p>
          <Link to="/gadgets" className="btn-primary mt-4">Browse gadgets</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table style={{ maxWidth: 240 + list.length * 380 }} className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40 border-b border-line py-3 text-left align-bottom text-ink3">Spec</th>
                  {list.map((g) => (
                    <th key={g.id} className="border-b border-line px-4 py-3 text-left align-bottom">
                      <div className="flex items-start gap-3">
                        <Img gadget={g} className="h-16 w-20 shrink-0" imgClass="p-1" />
                        <div>
                          <Link to={`/g/${g.id}`} className="font-semibold hover:text-primary">{displayName(g)}</Link>
                          <div>
                            <button type="button" onClick={() => onCompare(g.id)}
                              className="mt-1 text-xs font-medium text-danger hover:underline">
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, render]) => (
                  <tr key={label} className="border-b border-line">
                    <td className="py-3 pr-4 text-ink3">{label}</td>
                    {list.map((g) => (
                      <td key={g.id} className="px-4 py-3 text-ink2">{render(g)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex gap-3">
            <Link to="/gadgets" className="btn-ghost">Add another gadget</Link>
            <button type="button" onClick={() => list.forEach((g) => onCompare(g.id))} className="btn-ghost">Clear all</button>
          </div>
        </>
      )}
    </section>
  );
}

export default Compare;
