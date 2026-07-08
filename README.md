# @jasara/azlabels-ts-generator

TypeScript ZPL generator for Amazon **FNSKU / barcode** labels. It is a faithful
port of the ZPL logic in the private `jasara/azlabels-api` service
(`App\Services\Raw\Zpl\FNSKU` + `ZplManager`), kept byte-for-byte identical via a
**shared conformance corpus**.

No shared runtime, no WASM, no network — just the same layout math reimplemented
in TypeScript and pinned to azlabels-api's output by golden fixtures.

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

## The conformance corpus lives here

This repo is the **home of the shared contract**:
[`conformance/fnsku/*.json`](./conformance/fnsku), each file
`{ name, input, expectedZpl }`. `input` is the language-neutral label request;
`expectedZpl` is the raw ZPL azlabels-api's PHP produces for it.

Both sides assert against these same files, so neither can drift silently:

- **This repo** — `npm test` runs `generateFnskuZpl(input)` and asserts it equals
  `expectedZpl` for every fixture. Self-contained; the corpus is committed here.
- **azlabels-api** — its PHPUnit conformance test **fetches this corpus directly**
  from this public repo (raw over HTTP, with a local cache) and asserts its PHP
  generator still matches.

### Who owns what

- **azlabels-api owns the ZPL logic** (it is the live production service and the
  source of truth for what a correct label looks like). It regenerates
  `expectedZpl`.
- **This repo owns the corpus files** and the TypeScript port.

### Changing the ZPL logic

1. Change it in **azlabels-api** (PHP).
2. Re-baseline the corpus, writing back into this repo's checkout:
   ```
   # in azlabels-api, with this repo checked out
   ZPL_CONFORMANCE_DIR=/path/to/azlabels-ts-generator/conformance/fnsku \
   UPDATE_ZPL_FIXTURES=1 ./vendor/bin/phpunit --filter FnskuConformanceTest
   ```
   The resulting JSON diff here *is* the spec change.
3. Update this port until `npm test` is green against the new fixtures.
4. Commit the corpus diff (+ port change) here and the logic change in azlabels-api.

### Adding a case

Add a `conformance/fnsku/<name>.json` with an `input` (and any placeholder
`expectedZpl`), then run the azlabels-api re-baseline above to fill in
`expectedZpl`.

## Scripts

| script | purpose |
| --- | --- |
| `npm test` | run the conformance suite against the committed corpus |
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
