import React, { useEffect, useRef } from 'react';

function PreviewCanvas({ fileHandle, annotations, options }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let active = true;

    const renderPreview = async () => {
      if (!fileHandle || !canvasRef.current) return;

      const file = await fileHandle.getFile();
      const bmp = await createImageBitmap(file);
      if (!active) {
        bmp.close();
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = bmp.width;
      canvas.height = bmp.height;
      ctx.drawImage(bmp, 0, 0);

      for (const ann of annotations) {
        const x = Number.isFinite(ann.x) ? ann.x : 0;
        const y = Number.isFinite(ann.y) ? ann.y : 0;

        ctx.beginPath();
        ctx.arc(x, y, options.radius, 0, Math.PI * 2);
        ctx.fillStyle = options.color;
        ctx.fill();

        if (options.drawText) {
          const labelText = options.labelType === 'displayName'
            ? (ann.displayName || ann.id || '')
            : (ann.id || ann.displayName || '');
          ctx.font = `bold ${options.radius}px Arial`;
          ctx.fillStyle = options.color;
          ctx.fillText(labelText, x + options.radius + 5, y + 5);
        }
      }

      bmp.close();
    };

    renderPreview();
    return () => {
      active = false;
    };
  }, [fileHandle, annotations, options]);

  if (!fileHandle) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Missing
      </div>
    );
  }

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

export default React.memo(PreviewCanvas);
