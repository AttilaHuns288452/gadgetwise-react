// check-motion.mjs — answers "why don't I see animations?" in one run.
//
//   node check-motion.mjs [url]     (defaults to the production site)
//
// Measures in a real browser: prefers-reduced-motion, entrance-animation
// starts, and element opacity before/during/after the entrance wave.
// If reduce=true, the site is CORRECTLY rendering instantly — that preference
// is per-browser/OS, so a phone can animate while the laptop does not.
import { chromium } from "/home/attila/.hermes/hermes-agent/node_modules/playwright/index.mjs";

const URL = process.argv[2] || "https://gadgetwise-react.vercel.app/#/";
const result = {};
for (const [name, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: vp });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 80)));
  await p.addInitScript(() => {
    window.__anim = { starts: 0 };
    addEventListener("animationstart", () => window.__anim.starts++, true);
  });
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForTimeout(500);
  const sample = () => p.evaluate(() =>
    [...document.querySelectorAll(".stagger > *, .anim-fade-up, .anim-in, .reveal")].slice(0, 10)
      .map((e) => +getComputedStyle(e).opacity.slice(0, 4)));
  const early = await sample();
  await p.waitForTimeout(1200);
  const mid = await sample();
  result[name] = {
    reduce: await p.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
    starts: await p.evaluate(() => window.__anim.starts),
    early,
    mid,
    pageErrors: errs,
  };
  await b.close();
}
console.log(JSON.stringify(result, null, 1));
const r = result.desktop.reduce || result.mobile.reduce;
const animated = result.desktop.starts > 0 || result.mobile.starts > 0;
console.log(r
  ? "\nVERDICT: prefers-reduced-motion is ON in this environment — instant rendering is the intended, accessible behavior. Check the browser's Rendering emulation (DevTools -> Ctrl+Shift+P -> Rendering) or restart the browser if the OS setting changed."
  : animated
    ? "\nVERDICT: entrance animations are running in this environment."
    : "\nVERDICT: no entrance animations started and reduce is off — investigate the reveal system (console errors above, .is-live classes).");
