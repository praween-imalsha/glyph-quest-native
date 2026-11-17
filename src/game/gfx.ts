import { PaintStyle, Skia, type SkCanvas, type SkColor, type SkPicture } from "@shopify/react-native-skia";

const colorCache = new Map<string, SkColor>();
const toColor = (value: string): SkColor => {
  let color = colorCache.get(value);
  if (!color) {
    color = Skia.Color(value);
    colorCache.set(value, color);
  }
  return color;
};

/**
 * A tiny Canvas2D-shaped drawing surface on top of a Skia canvas.
 * The game renderer only needs filled and stroked rectangles, a global alpha,
 * and a little transform state, so that is all this implements.
 * Anti-aliasing is off so every pixel-art rect stays hard-edged.
 */
export class Gfx {
  fillStyle = "#000000";
  strokeStyle = "#000000";
  globalAlpha = 1;

  private readonly fill = Skia.Paint();
  private readonly line = Skia.Paint();

  constructor(private readonly canvas: SkCanvas) {
    this.fill.setAntiAlias(false);
    this.fill.setStyle(PaintStyle.Fill);
    this.line.setAntiAlias(false);
    this.line.setStyle(PaintStyle.Stroke);
    this.line.setStrokeWidth(1);
  }

  fillRect(x: number, y: number, w: number, h: number) {
    // Canvas2D accepts negative sizes (it flips the rect); Skia rects must be sorted.
    if (w < 0) {
      x += w;
      w = -w;
    }
    if (h < 0) {
      y += h;
      h = -h;
    }
    if (w === 0 || h === 0) return;
    this.fill.setColor(toColor(this.fillStyle));
    this.fill.setAlphaf(this.globalAlpha);
    this.canvas.drawRect(Skia.XYWHRect(x, y, w, h), this.fill);
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.line.setColor(toColor(this.strokeStyle));
    this.line.setAlphaf(this.globalAlpha);
    this.canvas.drawRect(Skia.XYWHRect(x, y, w, h), this.line);
  }

  save() {
    this.canvas.save();
  }

  restore() {
    this.canvas.restore();
  }

  translate(x: number, y: number) {
    this.canvas.translate(x, y);
  }

  drawPicture(picture: SkPicture) {
    this.canvas.drawPicture(picture);
  }
}
