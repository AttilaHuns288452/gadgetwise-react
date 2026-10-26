import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// A JSX tag whose component was deleted or never imported compiles fine and
// blanks the whole app at runtime. This walks every .jsx file and asserts each
// capitalized tag resolves to something defined or imported in that file.

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".jsx")) files.push(p);
  }
};
walk("src");

test("every capitalized JSX tag resolves to an import or local definition", () => {
  const problems = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const used = new Set();
    for (const m of src.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)) used.add(m[1]);
    const known = new Set();
    // imports: default + named, across multi-line import blocks
    for (const m of src.matchAll(/import\s+([^;]+?)\s+from\s+["'][^"']+["']/gs)) {
      const clause = m[1];
      const named = clause.match(/\{([^}]*)\}/);
      if (named) for (const n of named[1].split(",")) {
        const t = n.trim().split(/\s+as\s+/).pop().trim();
        if (t) known.add(t);
      }
      const def = clause.split(",")[0].replace(/\{.*/s, "").trim();
      if (def) known.add(def);
    }
    // local definitions
    for (const m of src.matchAll(/(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)/g)) known.add(m[1]);
    for (const tag of used) if (!known.has(tag)) problems.push(`${file}: <${tag}> is neither imported nor defined`);
  }
  assert.deepEqual(problems, []);
});

test("smoke: the suite found every jsx file to scan", () => {
  assert.ok(files.length > 5, `expected the src tree to contain jsx files, saw ${files.length}`);
});
