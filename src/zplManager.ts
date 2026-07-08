/**
 * Port of app/Services/Raw/Zpl/ZplManager.php from jasara/azlabels-api.
 *
 * This is a faithful, line-for-line port. The layout math (dot dimensions, the
 * measureText font-ratio table, getFontSize buckets, textboxHeight) MUST match
 * the PHP exactly — the shared conformance corpus is the guard. Do not "improve"
 * the ratios or rounding: they are empirical fudge factors tuned against Zebra's
 * built-in font 0/A on real printers.
 */

export type Density = number | null;
export type DotAxis = "height" | "width";

export class ZplManager {
  zpl = "";
  readonly dotWidth: number;
  readonly dotHeight: number;
  currentY = 0;

  constructor(size: string, density: Density) {
    // 120 or 12 dpmm -> 12 (300dpi); anything else -> 8 (203dpi).
    const dpmm = density === 120 || density === 12 ? 12 : 8;

    // size is "<width_cm>x<height_cm>" e.g. "7.625x2.5".
    const xIndex = size.indexOf("x");
    const widthCm = parseFloat(size.slice(0, xIndex));
    const heightCm = parseFloat(size.slice(xIndex + 1));

    // 1cm = 10mm; dots = cm * 10 * dpmm.
    this.dotWidth = Math.round(widthCm * 10 * dpmm);
    this.dotHeight = Math.round(heightCm * 10 * dpmm);
  }

  start(): void {
    // Start label, normal orientation, home at 10,10, shift 0, top 0.
    this.zpl += "^XA^LH10,10^LS0^LT0";
    this.zpl += "^PW" + this.dotWidth; // print width in dots
    this.zpl += "^FWN^CF0,30"; // font type 0, size 30
  }

  finish(): void {
    this.zpl += "^XZ";
  }

  measureText(text: string, fontSize: number): number {
    // ratio = fontSize / (dotWidth / maxCharsThatFit), tuned per font size.
    // NOTE: PHP uses strlen (bytes). This uses UTF-16 length; identical for
    // ASCII, which is all the FNSKU corpus contains. Multi-byte titles (CJK)
    // are routed to the image path upstream, never to this ZPL builder.
    let ratio: number;
    switch (fontSize) {
      case 90:
        ratio = 0.31;
        break;
      case 70:
        ratio = 0.314;
        break;
      case 50:
        ratio = 0.432;
        break;
      case 40:
        ratio = 0.435;
        break;
      case 35:
        ratio = 0.436;
        break;
      case 30:
        ratio = 0.437;
        break;
      case 20:
      default:
        ratio = 0.4;
        break;
    }

    return Math.floor(text.length * fontSize * ratio);
  }

  centerXPos(elementWidth: number): number {
    return Math.floor(this.dotWidth / 2 - elementWidth / 2);
  }

  getDots(percentage: number, type: DotAxis = "height"): number {
    const base = type === "width" ? this.dotWidth : this.dotHeight;
    return Math.floor(base * percentage);
  }

  getFontSize(type: string): number {
    switch (type) {
      case "generic-single-line":
        return this.dotWidth > 1200 ? 110 : 90;
      case "shipping-title":
        return this.dotWidth > 1200 ? 90 : 70;
      case "generic-top-lines":
        return this.dotWidth > 1200 ? 70 : 50;
      case "shipping-address":
        return this.dotWidth > 1200 ? 55 : 35;
      case "shipping-uncovered":
      case "fnsku":
      case "expiration-date":
        if (this.dotWidth > 1200) return 60;
        if (this.dotWidth > 650) return 40;
        return 30;
      case "title":
        return this.dotWidth > 650 ? 30 : 23;
      case "2d-address":
        return this.dotWidth > 1200 ? 30 : 20;
      case "shipping-date-bar":
        return this.dotWidth > 1200 ? 35 : 20;
      case "condition":
      case "generic-bottom-line":
      case "expiration-date-label":
      default:
        return 30;
    }
  }

  textboxHeight(text: string, fontType = "title"): number {
    const yInBox = this.getDots(0.9, "width");
    const textLength = this.measureText(text, this.getFontSize(fontType));
    const ratio = Math.ceil(textLength / yInBox);

    // Cap the text box at 30% of label height.
    const percentageOfLabelHeight = Math.min(3, ratio) / 10;

    return Math.max(50, this.getDots(percentageOfLabelHeight));
  }

  append(input: string): void {
    this.zpl += input;
  }

  insert(input: string): void {
    if (this.zpl.includes("^XZ")) {
      // PHP str_replace replaces every occurrence, so mirror with replaceAll.
      this.zpl = this.zpl.replaceAll("^XZ", input + "^XZ");
      return;
    }
    this.zpl += input;
  }
}
