import { FNSKU, type LabelInput } from "./fnsku";
import type { Density } from "./zplManager";

export { FNSKU } from "./fnsku";
export { ZplManager } from "./zplManager";
export type { LabelInput, LabelType } from "./fnsku";
export type { Density, DotAxis } from "./zplManager";

/**
 * Input to {@link generateFnskuZpl}. Mirrors the `input` object of the shared
 * conformance fixtures, so a fixture can be fed in verbatim.
 */
export interface FnskuZplInput {
  /** "<width_cm>x<height_cm>", e.g. "7.625x2.5". */
  size: string;
  /** Printer density; 120|12 => 300dpi, anything else (incl. null) => 203dpi. */
  density?: Density;
  labels: LabelInput[];
}

/**
 * Generate raw ZPL for a batch of FNSKU / divider labels.
 *
 * Returns a single unbroken ZPL string (no newlines) — byte-for-byte identical
 * to jasara/azlabels-api's `App\Services\Raw\Zpl\FNSKU::handle()`.
 */
export function generateFnskuZpl(input: FnskuZplInput): string {
  return new FNSKU(input.labels, input.size, input.density ?? null).handle();
}
