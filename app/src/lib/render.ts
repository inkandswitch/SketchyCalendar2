export interface RenderCamera {
  position: { x: number; y: number };
  zoom: number;
}

// A simple wrapper around canvas
export default class Render {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageCache: Record<string, HTMLImageElement> = {};

  width!: number;
  height!: number;

  constructor() {
    this.canvas = document.createElement("canvas");
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    // Initial setup via the resize handler
    this.handleResize();

    // Add resize listener
    window.addEventListener("resize", this.handleResize);

    // Default to round joins (also set in handleResize)
    this.ctx.lineJoin = "round";
  }

  // Changed to arrow function to automatically bind 'this'
  private handleResize = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.scale(dpr, dpr);

    // Re-apply default context settings that might be lost on resize
    this.ctx.lineJoin = "round";
  };

  destroy() {
    // Remove resize listener
    window.removeEventListener("resize", this.handleResize);
    this.canvas.remove();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  beginOffset(camera: RenderCamera) {
    this.ctx.save();
    this.ctx.scale(camera.zoom, camera.zoom);
    this.ctx.translate(camera.position.x, camera.position.y);
  }

  endOffset() {
    this.ctx.restore();
  }

  applyStyle(style: RenderStyle) {
    this.ctx.fillStyle = style.fillStyle;
    this.ctx.strokeStyle = style.strokeStyle;
    this.ctx.lineWidth = style.lineWidth;
    if (style.font) {
      this.ctx.font = style.font;
    }
    if (style.baseline) {
      this.ctx.textBaseline = style.baseline;
    }

    this.ctx.setLineDash(style.dashed || []);
  }

  line(x1: number, y1: number, x2: number, y2: number, style: RenderStyle) {
    this.applyStyle(style);
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  point(x: number, y: number, style: RenderStyle) {
    this.applyStyle(style);
    this.ctx.fillRect(x - 1, y - 1, 2, 2);
  }

  rect(x: number, y: number, w: number, h: number, style: RenderStyle) {
    this.applyStyle(style);
    if (style.doFill) {
      this.ctx.fillRect(x, y, w, h);
    }
    if (style.doStroke) {
      this.ctx.strokeRect(x, y, w, h);
    }
  }

  round_rect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    style: RenderStyle
  ) {
    this.applyStyle(style);
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
    if (style.doFill) {
      this.ctx.fill();
    }
    if (style.doStroke) {
      this.ctx.stroke();
    }
  }

  circle(x: number, y: number, r: number, style: RenderStyle) {
    this.applyStyle(style);
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (style.doFill) {
      this.ctx.fill();
    }
    if (style.doStroke) {
      this.ctx.stroke();
    }
  }

  poly(
    points: Array<{ x: number; y: number }>,
    style: RenderStyle,
    closed = true
  ) {
    if (points.length < 2) return;

    this.applyStyle(style);
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    if (closed) this.ctx.closePath();
    if (style.doFill) {
      this.ctx.fill();
    }
    if (style.doStroke) {
      this.ctx.stroke();
    }
  }

  text(text: string, x: number, y: number, style: RenderStyle) {
    //this.ctx.save();
    this.applyStyle(style);
    if (style.doFill) {
      this.ctx.fillText(text, x, y);
    }
    //this.ctx.restore();
  }

  arrow(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    style: RenderStyle,
    headLength: number = 10
  ) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headAngle1 = angle + Math.PI / 6;
    const headAngle2 = angle - Math.PI / 6;

    this.applyStyle(style);
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(headAngle1),
      toY - headLength * Math.sin(headAngle1)
    );
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(headAngle2),
      toY - headLength * Math.sin(headAngle2)
    );
    if (style.doStroke) {
      this.ctx.stroke();
    }
    if (style.doFill) {
      this.ctx.fill();
    }
  }

  private loadImage(src: string): HTMLImageElement | undefined {
    if (this.imageCache[src]) {
      return this.imageCache[src];
    } else {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        this.imageCache[src] = img;
      };
    }
  }

  image(url: string, x: number, y: number) {
    const img = this.loadImage(url);
    if (img) {
      this.ctx.drawImage(
        img,
        x,
        y,
        img.naturalWidth / 2,
        img.naturalHeight / 2
      );
    }
  }
}

export type RenderStyle = {
  fillStyle: string | CanvasPattern;
  strokeStyle: string;
  font: string | null;
  lineWidth: number;
  doFill: boolean;
  doStroke: boolean;
  dashed?: number[];
  baseline: CanvasTextBaseline;
};

export function defaultStyle(): RenderStyle {
  return {
    fillStyle: "black",
    strokeStyle: "black",
    font: null,
    lineWidth: 1,
    doFill: true,
    doStroke: true,
    baseline: "top",
  };
}

export function fill(fillStyle: string | CanvasPattern): RenderStyle {
  let s = defaultStyle();
  s.fillStyle = fillStyle;
  s.doStroke = false;
  return s;
}

export function stroke(strokeStyle: string, lineWidth: number): RenderStyle {
  let s = defaultStyle();
  s.strokeStyle = strokeStyle;
  s.lineWidth = lineWidth;
  s.doFill = false;
  return s;
}

export function dashedStroke(
  strokeStyle: string,
  lineWidth: number,
  dash: number[]
): RenderStyle {
  let s = defaultStyle();
  s.strokeStyle = strokeStyle;
  s.lineWidth = lineWidth;
  s.dashed = dash;
  s.doFill = false;
  return s;
}

export function fillAndStroke(
  fillStyle: string,
  strokeStyle: string,
  lineWidth: number
): RenderStyle {
  let s = defaultStyle();
  s.fillStyle = fillStyle;
  s.strokeStyle = strokeStyle;
  s.lineWidth = lineWidth;
  return s;
}

export function font(font: string, fill: string): RenderStyle {
  let s = defaultStyle();
  s.font = font;
  s.doFill = true;
  s.fillStyle = fill;
  s.doStroke = false;
  return s;
}
