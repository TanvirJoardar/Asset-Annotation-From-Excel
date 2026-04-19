export interface SafeRenderPlan {
  width: number;
  height: number;
  scale: number;
  downscaled: boolean;
}

const MAX_CANVAS_DIMENSION = 8192;
const MAX_CANVAS_AREA = 64 * 1024 * 1024;

export const getSafeRenderPlan = (sourceWidth: number, sourceHeight: number): SafeRenderPlan => {
  const width = Math.max(1, Math.floor(sourceWidth));
  const height = Math.max(1, Math.floor(sourceHeight));

  const scaleByDimension = MAX_CANVAS_DIMENSION / Math.max(width, height);
  const scaleByArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
  const rawScale = Math.min(1, scaleByDimension, scaleByArea);
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;

  const targetWidth = Math.max(1, Math.floor(width * scale));
  const targetHeight = Math.max(1, Math.floor(height * scale));

  return {
    width: targetWidth,
    height: targetHeight,
    scale,
    downscaled: scale < 0.999
  };
};
