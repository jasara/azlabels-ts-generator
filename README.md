# @jasara/azlabels-ts-generator

TypeScript ZPL generator for Amazon **FNSKU / barcode** labels. Its output is
pinned **byte-for-byte** to a reference implementation via a shared golden
**conformance corpus** — so labels render identically wherever they're produced.

No native dependencies, no WASM, no network — just ZPL layout math and command
strings.

## Install

```bash
npm install @jasara/azlabels-ts-generator
```

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

## API

- `generateFnskuZpl(input): string` — build ZPL for a batch of FNSKU / divider labels.
- `FNSKU`, `ZplManager` — the underlying classes, if you need lower-level control.
- Types: `FnskuZplInput`, `LabelInput`, `LabelType`, `Density`, `DotAxis`.

## Conformance

`conformance/fnsku/*.json` holds golden fixtures — each `{ name, input, expectedZpl }`.
`npm test` runs `generateFnskuZpl(input)` and asserts it equals `expectedZpl` for
every fixture, so the generator can never drift from the reference output.

You can spot-check any fixture's `expectedZpl` visually by pasting it into
<http://labelary.com/viewer.html>.

## Scripts

| script | purpose |
| --- | --- |
| `npm test` | run the conformance suite against the committed corpus |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | bundle ESM + CJS + types to `dist/` via tsup |

## Scope & caveats

- **FNSKU + divider labels only.** Other label types can be added the same way as
  their fixtures land in the corpus.
- `measureText` uses empirical per-font-size ratios tuned for Zebra's built-in
  font 0/A. They are intentionally exact — do not re-derive them.
- Titles are assumed ASCII (barcode/label identifiers and product titles in that
  range). Non-ASCII / CJK titles are out of scope for this ZPL builder.
