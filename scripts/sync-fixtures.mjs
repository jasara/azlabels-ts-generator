// Pre-test step: copy the shared ZPL conformance corpus from the canonical
// producer (jasara/azlabels-api) into this repo's test fixtures.
//
// The corpus is NOT committed here (see .gitignore) — azlabels-api owns it.
// Source resolution order:
//   1. $AZLABELS_CONFORMANCE_DIR (point straight at .../conformance/fnsku)
//   2. a few conventional relative locations (local sibling / conductor layout)
//   3. otherwise: fall back to whatever is already in test/fixtures, or fail.
//
// CI checks out azlabels-api and sets AZLABELS_CONFORMANCE_DIR.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const dest = join(pkgRoot, "test", "fixtures", "fnsku");

const candidates = [
  process.env.AZLABELS_CONFORMANCE_DIR,
  // Prototype lives inside the azlabels-api workspace: <repo>/.context/<pkg>.
  resolve(pkgRoot, "../../conformance/fnsku"),
  // Sibling checkout.
  resolve(pkgRoot, "../azlabels-api/conformance/fnsku"),
  // Conductor workspace layout.
  resolve(pkgRoot, "../azlabels-api/damascus-v6/conformance/fnsku"),
].filter(Boolean);

const src = candidates.find((p) => existsSync(p));

function jsonCount(dir) {
  return existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".json")).length
    : 0;
}

if (!src) {
  if (jsonCount(dest) > 0) {
    console.warn(
      "[sync-fixtures] azlabels-api conformance dir not found; using existing " +
        `${jsonCount(dest)} fixture(s) in ${dest}.\n` +
        "  Set AZLABELS_CONFORMANCE_DIR to refresh from the canonical source.",
    );
    process.exit(0);
  }
  console.error(
    "[sync-fixtures] Could not locate the conformance corpus and no fixtures " +
      "are present.\n  Set AZLABELS_CONFORMANCE_DIR=/path/to/azlabels-api/conformance/fnsku",
  );
  process.exit(1);
}

// Mirror the source: drop stale fixtures so deletions propagate.
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const file of readdirSync(src).filter((f) => f.endsWith(".json"))) {
  cpSync(join(src, file), join(dest, file));
}

console.log(`[sync-fixtures] Synced ${jsonCount(dest)} fixture(s) from ${src}`);
