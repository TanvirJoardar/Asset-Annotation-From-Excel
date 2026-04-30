import { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { Annotation, AppFileHandle, RenderOptions } from '../types';
import { getSafeRenderPlan } from '../utils/imageRendering';

interface PreviewCanvasProps {
  fileHandle?: AppFileHandle;
  annotations: Annotation[];
  options: RenderOptions;
}

function PreviewCanvas({ fileHandle, annotations, options }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDownscaled, setIsDownscaled] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const renderPreview = async () => {
      if (!fileHandle || !canvasRef.current) {
        setRenderError(null);
        setIsDownscaled(false);
        return;
      }

      try {
        setRenderError(null);
        const file = await fileHandle.getFile();
        const bmp = await createImageBitmap(file);
        if (!active) {
          bmp.close();
          return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          bmp.close();
          return;
        }

        const renderPlan = getSafeRenderPlan(bmp.width, bmp.height);
        setIsDownscaled(renderPlan.downscaled);

        canvas.width = renderPlan.width;
        canvas.height = renderPlan.height;
        ctx.drawImage(bmp, 0, 0, renderPlan.width, renderPlan.height);

        const radius = Math.max(1, options.radius * renderPlan.scale);
        const textSize = Math.max(8, Math.round(options.radius * renderPlan.scale));

        for (const ann of annotations) {
          // Ignore rows with incomplete coordinates so neither marker nor label is rendered.
          if (!Number.isFinite(ann.x) || !Number.isFinite(ann.y)) {
            continue;
          }

          const x = ann.x * renderPlan.scale;
          const y = ann.y * renderPlan.scale;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = options.color;
          ctx.fill();

          if (options.drawText) {
            const labelText = options.labelType === 'displayName'
              ? (ann.displayName || ann.id || '')
              : (ann.id || ann.displayName || '');
            ctx.font = `bold ${textSize}px Arial`;
            ctx.fillStyle = options.labelColor;
            ctx.fillText(labelText, x + radius + 5, y + 5);
          }
        }

        bmp.close();
      } catch (error) {
        setRenderError(error instanceof Error ? error.message : 'Preview rendering failed');
      }
    };

    void renderPreview();
    return () => {
      active = false;
    };
  }, [fileHandle, annotations, options]);

  if (!fileHandle) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          gap: '0.5rem',
          fontWeight: 500
        }}
      >
        <ImageOff size={30} strokeWidth={2.2} />
        <span>Image Missing in Folder</span>
      </div>
    );
  }

  if (renderError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          padding: '0.75rem',
          textAlign: 'center'
        }}
        title={renderError}
      >
        Preview unavailable
      </div>
    );
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {isDownscaled && (
        <div
          style={{
            position: 'absolute',
            left: '0.5rem',
            bottom: '0.5rem',
            padding: '0.2rem 0.45rem',
            borderRadius: '999px',
            fontSize: '0.65rem',
            fontWeight: 700,
            background: 'rgba(14, 116, 144, 0.8)',
            color: '#e0f2fe',
            border: '1px solid rgba(56, 189, 248, 0.5)'
          }}
          title="Image is rendered at a safe preview scale due to very large dimensions"
        >
          Scaled Preview
        </div>
      )}
    </>
  );
}

export default PreviewCanvas;
