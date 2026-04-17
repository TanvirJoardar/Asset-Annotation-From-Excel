import { useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import PreviewCanvas from './PreviewCanvas';
import type { Annotation, AppFileHandle, RenderOptions } from '../types';

interface ModalPreviewProps {
  selectedPreview: string | null;
  setSelectedPreview: (name: string | null) => void;
  imageHandles: Map<string, AppFileHandle>;
  dataMap: Map<string, Annotation[]>;
  options: RenderOptions;
  modalZoom: number;
  setModalZoom: Dispatch<SetStateAction<number>>;
  modalContentRef: RefObject<HTMLDivElement | null>;
}

export default function ModalPreview({
  selectedPreview,
  setSelectedPreview,
  imageHandles,
  dataMap,
  options,
  modalZoom,
  setModalZoom,
  modalContentRef
}: ModalPreviewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0, pointerId: -1 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPreview(null);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelectedPreview]);

  useEffect(() => {
    if (!selectedPreview) return;

    const loadImageSize = async () => {
      const handle = imageHandles.get(selectedPreview);
      if (!handle || !modalContentRef.current) return;

      try {
        const file = await handle.getFile();
        const bmp = await createImageBitmap(file);
        const size = { width: bmp.width, height: bmp.height };
        setImageSize(size);

        const container = modalContentRef.current;
        const availW = container.clientWidth - 64;
        const availH = container.clientHeight - 120;
        const fitScale = Math.min(availW / size.width, availH / size.height);
        setModalZoom(Math.min(1, fitScale));
        bmp.close();
      } catch (e) {
        console.warn('Failed to load image size:', e);
        setModalZoom(1);
      }
    };

    void loadImageSize();
  }, [selectedPreview, imageHandles, modalContentRef, setModalZoom]);

  if (!selectedPreview) return null;

  const handle = imageHandles.get(selectedPreview);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    isPanningRef.current = true;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
      pointerId: e.pointerId
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current || !scrollRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    scrollRef.current.scrollLeft = startRef.current.scrollLeft - dx;
    scrollRef.current.scrollTop = startRef.current.scrollTop - dy;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors if pointer was already released.
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedPreview(null);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        className="modal-content"
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--surface, #fff)',
          padding: '16px',
          borderRadius: '8px',
          width: '95vw',
          height: '95vh',
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10001 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.55)', padding: '6px', borderRadius: 6 }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setModalZoom((z) => Math.max(0.1, z / 1.25)); }}
              style={{ background: 'white', color: '#111', border: 'none', padding: '6px 8px', borderRadius: 4, cursor: 'pointer' }}
            >
              -
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (imageSize.width > 0 && modalContentRef.current) {
                  const container = modalContentRef.current;
                  const availW = container.clientWidth - 64;
                  const availH = container.clientHeight - 120;
                  const fitScale = Math.min(availW / imageSize.width, availH / imageSize.height);
                  setModalZoom(Math.min(1, fitScale));
                } else {
                  setModalZoom(1);
                }

                if (scrollRef.current) {
                  scrollRef.current.scrollLeft = 0;
                  scrollRef.current.scrollTop = 0;
                }
              }}
              style={{ background: 'white', color: '#111', border: 'none', padding: '6px 8px', borderRadius: 4, cursor: 'pointer' }}
            >
              Fit
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setModalZoom((z) => Math.min(8, z * 1.25)); }}
              style={{ background: 'white', color: '#111', border: 'none', padding: '6px 8px', borderRadius: 4, cursor: 'pointer' }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setSelectedPreview(null); }}>
            Close
          </button>
        </div>

        <div
          ref={scrollRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            flex: 1,
            overflow: modalZoom > 1 ? 'auto' : 'hidden',
            position: 'relative',
            cursor: isPanningRef.current ? 'grabbing' : (modalZoom > 1 ? 'grab' : 'default'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              position: 'relative',
              transformOrigin: 'center center',
              transform: `scale(${modalZoom})`,
              transition: 'none',
              willChange: 'transform'
            }}
          >
            <PreviewCanvas fileHandle={handle} annotations={dataMap.get(selectedPreview) ?? []} options={options} />
          </div>
        </div>
      </div>
    </div>
  );
}
