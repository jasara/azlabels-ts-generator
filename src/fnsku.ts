/**
 * FNSKU / divider label ZPL builder.
 *
 * Faithful line-for-line port of the reference implementation, guarded by the
 * shared conformance corpus.
 */

import { ZplManager, type Density } from "./zplManager";

export type LabelType = "fnsku" | "divider";

/**
 * Language-neutral label shape — matches the `labels[]` entries in the
 * conformance fixtures (snake_case on purpose so fixtures feed straight in).
 * `msku` is carried for parity with the PHP data objects but is unused here.
 */
export interface LabelInput {
  type?: LabelType;
  count?: number;
  barcode_value: string;
  title: string;
  condition: string | null;
  msku?: string | null;
  expiration_date?: string | null;
}

export class FNSKU {
  private readonly zpl: ZplManager;
  private readonly leftMargin: number;
  private readonly topMargin: number;

  constructor(
    private readonly labels: LabelInput[],
    size: string,
    density: Density = null,
  ) {
    this.zpl = new ZplManager(size, density);
    this.leftMargin = Math.round(0.03 * this.zpl.dotWidth);
    this.topMargin = Math.round(0.05 * this.zpl.dotHeight);
  }

  handle(): string {
    for (const label of this.labels) {
      const isDivider = label.type === "divider";
      // DividerLabel always renders once (PHP fixes count at 1).
      const count = isDivider ? 1 : label.count ?? 1;

      for (let i = 0; i < count; i++) {
        if (isDivider) {
          this.createDividerLabel(
            label.barcode_value,
            label.title,
            label.condition,
            label.expiration_date ?? null,
          );
        } else {
          this.createFnskuLabel(
            label.barcode_value,
            label.title,
            label.condition,
            label.expiration_date ?? null,
          );
        }
      }
    }

    return this.zpl.zpl;
  }

  private createFnskuLabel(
    fnsku: string,
    title: string,
    condition: string | null,
    expirationDate: string | null,
  ): void {
    this.zpl.start();

    // Barcode.
    this.zpl.append(this.barcodeWidthCommand());
    this.zpl.append(
      "^FO" + this.zpl.centerXPos(this.barcodeWidth()) + "," + this.topMargin,
    );
    this.zpl.append("^BCN," + this.zpl.getDots(0.3) + ",N");
    this.zpl.append("^FD" + fnsku + "^FS");

    this.zpl.currentY =
      this.zpl.getDots(0.3) + this.topMargin + this.zpl.getDots(0.02);

    // FNSKU text under barcode.
    this.zpl.append("^CF0," + this.zpl.getFontSize("fnsku"));
    this.zpl.append(
      "^FO" +
        this.zpl.centerXPos(
          this.zpl.measureText(fnsku, this.zpl.getFontSize("fnsku")),
        ) +
        "," +
        this.zpl.currentY,
    );
    this.zpl.append("^FD" + fnsku + "^FS");

    this.zpl.currentY += this.zpl.getDots(0.12);

    if (!expirationDate) {
      // Product title as a text box.
      const textboxHeight = this.zpl.textboxHeight(title);
      this.zpl.append("^CFA," + this.zpl.getFontSize("title"));
      this.zpl.append("^FO" + this.leftMargin + "," + this.zpl.currentY);
      this.zpl.append(
        "^TBN," + this.zpl.getDots(0.9, "width") + "," + textboxHeight,
      );
      this.zpl.append("^FD" + title + "^FS");

      this.zpl.currentY += textboxHeight + this.zpl.getDots(0.02);
    } else {
      // Single-line title (leaves room for the expiration block).
      this.zpl.append("^CF0," + this.zpl.getFontSize("title"));
      this.zpl.append("^FO" + this.leftMargin + "," + this.zpl.currentY);
      this.zpl.append("^FD" + title + "^FS");

      this.zpl.currentY += this.zpl.getDots(0.07);
    }

    // Condition.
    this.zpl.append("^CF0," + this.zpl.getFontSize("condition"));
    this.zpl.append("^FO" + this.leftMargin + "," + this.zpl.currentY);
    this.zpl.append("^FD" + condition + "^FS");

    if (expirationDate) {
      this.zpl.currentY += this.zpl.getDots(0.1);

      // "EXP DATE:" label.
      this.zpl.append("^CF0," + this.zpl.getFontSize("expiration-date-label"));
      this.zpl.append("^FO" + this.leftMargin + "," + this.zpl.currentY);
      this.zpl.append("^FDEXP DATE:^FS");

      // The date itself, offset to the right.
      this.zpl.append("^CF0," + this.zpl.getFontSize("expiration-date"));
      this.zpl.append(
        "^FO" +
          (this.leftMargin + this.zpl.getDots(0.3, "width")) +
          "," +
          this.zpl.currentY,
      );
      this.zpl.append("^FD" + expirationDate + "^FS");
    }

    this.zpl.finish();
  }

  private createDividerLabel(
    fnsku: string,
    title: string,
    condition: string | null,
    expirationDate: string | null,
  ): void {
    this.zpl.start();

    const labelWidth = this.zpl.dotWidth - 2 * this.leftMargin;

    // Top border line.
    this.zpl.append("^FO" + this.leftMargin + "," + this.topMargin);
    this.zpl.append("^GB" + labelWidth + ",3,3,B,0^FS");

    this.zpl.currentY = this.topMargin + this.zpl.getDots(0.1);

    // Large centered FNSKU.
    const fnskuFontSize = this.zpl.getFontSize("fnsku") * 2;
    this.zpl.append("^CF0," + fnskuFontSize);
    this.zpl.append(
      "^FO" +
        this.zpl.centerXPos(this.zpl.measureText(fnsku, fnskuFontSize)) +
        "," +
        this.zpl.currentY,
    );
    this.zpl.append("^FD" + fnsku + "^FS");

    this.zpl.currentY += this.zpl.getDots(0.25);

    const smallFontSize = this.zpl.getFontSize("condition") * 0.8;

    // Condition.
    if (condition) {
      this.zpl.append("^CF0," + smallFontSize);
      this.zpl.append("^FO" + this.leftMargin + "," + this.zpl.currentY);
      this.zpl.append("^FDCondition: " + condition + "^FS");
      this.zpl.currentY += this.zpl.getDots(0.07);
    }

    // Expiration date.
    if (expirationDate) {
      this.zpl.append("^CF0," + smallFontSize);
      this.zpl.append("^FO" + this.leftMargin + "," + this.zpl.currentY);
      this.zpl.append("^FDEXP DATE: " + expirationDate + "^FS");
      this.zpl.currentY += this.zpl.getDots(0.07);
    }

    const textboxHeight = this.zpl.textboxHeight(title) - 5;
    this.zpl.append("^CF0," + smallFontSize);
    this.zpl.append("^FO" + this.leftMargin + "," + this.zpl.currentY);
    this.zpl.append(
      "^TBN," + this.zpl.getDots(0.9, "width") + "," + textboxHeight,
    );
    this.zpl.append("^FDTitle: " + title + "^FS");
    this.zpl.currentY += textboxHeight + this.zpl.getDots(0.02);

    // Bottom border line, clamped inside the label.
    const minBottomMargin = this.zpl.getDots(0.1);
    let bottomLineY: number;
    if (this.zpl.currentY + minBottomMargin > this.zpl.dotHeight - minBottomMargin) {
      bottomLineY = this.zpl.dotHeight - minBottomMargin;
    } else {
      bottomLineY = this.zpl.currentY + minBottomMargin;
    }

    this.zpl.append("^FO" + this.leftMargin + "," + bottomLineY);
    this.zpl.append("^GB" + labelWidth + ",3,3,B,0^FS");

    this.zpl.finish();
  }

  private barcodeWidthCommand(): string {
    if (this.zpl.dotWidth > 650) return "^BY" + 4;
    if (this.zpl.dotWidth > 460) return "^BY" + 3;
    if (this.zpl.dotWidth > 328) return "^BY" + 2;
    return "^BY" + 1;
  }

  private barcodeWidth(): number {
    if (this.zpl.dotWidth > 650) return 580;
    if (this.zpl.dotWidth > 460) return 440;
    if (this.zpl.dotWidth > 328) return 278;
    return 140;
  }
}
