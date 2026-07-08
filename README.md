# @jasara/azlabels-ts-generator

TypeScript ZPL generator for Amazon **FNSKU / barcode** labels. It is a faithful
port of the ZPL logic in the private `jasara/azlabels-api` service
(`App\Services\Raw\Zpl\FNSKU` + `ZplManager`), kept byte-for-byte identical via a
**shared conformance corpus**.

No shared runtime, no WASM, no network — just the same layout math reimplemented
in TypeScript and pinned to PHP's output by golden fixtures.

## Usage

```ts
import { generateFnskuZpl } from "@jasara/azlabels-ts-generator";

const zpl = generateFnskuZpl({
  size: "7.625x2.5", // "<width_cm>x<height_cm>"
  density: 80,       // 120|12 => 300dpi; anything else (incl. omitted) => 203dpi
  labels: [
    {
      type: "fnsku", // or "divider"
      count: 1,
      barcode_value: "X002339GD5",
      title: "Pascall Pineapple Lumps 185g",
      condition: "New",
      expiration_date: null, // "YYYY-MM-DD"-ish enables the EXP DATE line
    },
  ],
});
// -> "^XA^LH10,10^LS0^LT0^PW610^FWN^CF0,30^BY3^FO85,10^BCN,60,N^FDX002339GD5^FS..."
```

The output is a single unbroken ZPL string (no newlines). The Code 128 barcode is
rendered natively by the printer (`^BC`/`^BY`), so there is **no barcode-library
dependency** — the package only produces command strings and layout math.

## How it stays in sync with azlabels-api

`jasara/azlabels-api` is **canonical**. It owns the ZPL logic and generates the
conformance corpus (`conformance/fnsku/*.json`, each `{name, input, expectedZpl}`).

This repo does **not** commit the corpus. Instead, `pretest` copies it in from a
local checkout of azlabels-api via `scripts/sync-fixtures.mjs`:

```
npm test
# -> pretest: [sync-fixtures] Synced N fixture(s) from .../azlabels-api/conformance/fnsku
# -> vitest asserts generateFnskuZpl(input) === expectedZpl for every fixture
```

Point the sync at the source explicitly when the layout isn't auto-detected:

```
AZLABELS_CONFORMANCE_DIR=/path/to/azlabels-api/conformance/fnsku npm test
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) checks out azlabels-api
(needs an `AZLABELS_API_TOKEN` secret with read access) and sets that env var.

### When the ZPL logic changes

1. Change it in **azlabels-api** (PHP, canonical) and regenerate the corpus there:
   `UPDATE_ZPL_FIXTURES=1 ./vendor/bin/phpunit --filter FnskuConformanceTest`.
2. Run `npm test` here — the refreshed fixtures flow in via `pretest`.
3. Update this port until every fixture is green again. The failing diff is the
   spec change.

Neither side can drift silently: azlabels-api's PHPUnit guard and this repo's
Vitest suite both assert against the same fixtures.

## Scripts

| script | purpose |
| --- | --- |
| `npm test` | sync corpus (pretest) + run conformance suite |
| `npm run sync-fixtures` | copy the corpus from azlabels-api |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | bundle ESM + CJS + types to `dist/` via tsup |

## Scope & caveats

- **FNSKU + divider labels only** (matches the current corpus). Generic barcode /
  Amazon box ZPL can be added the same way once their fixtures exist.
- `measureText` uses empirical per-font-size ratios tuned for Zebra's built-in
  font 0/A. They are copied verbatim from PHP — do not re-derive them.
- Titles are assumed ASCII. CJK titles are routed to an image path upstream in
  azlabels-api and never reach this ZPL builder, so the byte-length vs
  UTF-16-length difference between PHP `strlen` and JS `.length` does not bite.
- Visual correctness of a fixture can be spot-checked by pasting `expectedZpl`
  into <http://labelary.com/viewer.html>.
