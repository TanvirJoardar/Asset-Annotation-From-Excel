import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
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
}

const normalizePath = (path: string): string => path.replace(/\\/g, '/').toLowerCase();

const getFileName = (path: string): string => {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
};

const findMatchingPath = <T,>(targetPath: string, source: Map<string, T>): string | null => {
  if (source.has(targetPath)) {
    return targetPath;
  }

  const targetNormalized = normalizePath(targetPath);
  for (const key of source.keys()) {
    if (normalizePath(key) === targetNormalized) {
      return key;
    }
  }

  const targetFileName = getFileName(targetPath).toLowerCase();
  for (const key of source.keys()) {
    if (getFileName(key).toLowerCase() === targetFileName) {
      return key;
    }
  }

  return null;
};

const getFitScale = (container: HTMLDivElement, width: number, height: number): number => {
  if (width <= 0 || height <= 0) {
    return 1;
  }

  const availW = Math.max(1, container.clientWidth - 64);
  const availH = Math.max(1, container.clientHeight - 120);
  const fitScale = Math.min(availW / width, availH / height);

  if (!Number.isFinite(fitScale) || fitScale <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0.1, fitScale));
};

export default function ModalPreview({
  selectedPreview,
  setSelectedPreview,
  imageHandles,
  dataMap,
  options,
  modalZoom,
  setModalZoom
}: ModalPreviewProps) {
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0, pointerId: -1 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const resolvedPreviewPath = useMemo(() => {
    if (!selectedPreview) {
      return null;
    }

    return findMatchingPath(selectedPreview, imageHandles) ?? findMatchingPath(selectedPreview, dataMap) ?? selectedPreview;
  }, [selectedPreview, imageHandles, dataMap]);

  const selectedHandle = useMemo(() => {
    if (!resolvedPreviewPath) {
      return undefined;
    }

    const key = findMatchingPath(resolvedPreviewPath, imageHandles);
    return key ? imageHandles.get(key) : undefined;
  }, [resolvedPreviewPath, imageHandles]);

  const selectedAnnotations = useMemo(() => {
    if (!resolvedPreviewPath) {
      return [];
    }

    const key = findMatchingPath(resolvedPreviewPath, dataMap);
    return key ? (dataMap.get(key) ?? []) : [];
  }, [resolvedPreviewPath, dataMap]);

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
      const handle = selectedHandle;
      if (!handle || !modalContentRef.current) return;

      try {
        const file = await handle.getFile();
        const bmp = await createImageBitmap(file);
        const size = { width: bmp.width, height: bmp.height };
        setImageSize(size);

        const container = modalContentRef.current;
        setModalZoom(getFitScale(container, size.width, size.height));
        bmp.close();
      } catch (e) {
        console.warn('Failed to load image size:', e);
        setModalZoom(1);
      }
    };

    void loadImageSize();
  }, [selectedPreview, selectedHandle, setModalZoom]);

  if (!selectedPreview) return null;

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

  const modalElement = (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedPreview(null);
      }}
    >
      <div className="modal-content" ref={modalContentRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-toolbar" onClick={(e) => e.stopPropagation()}>
          <div className="toolbar-inner">
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
                  setModalZoom(getFitScale(container, imageSize.width, imageSize.height));
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
          className="modal-scroll"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            overflow: modalZoom > 1 ? 'auto' : 'hidden',
            cursor: isPanningRef.current ? 'grabbing' : (modalZoom > 1 ? 'grab' : 'default')
          }}
        >
          <div
            style={{
              position: 'relative',
              transformOrigin: 'top left',
              transform: `scale(${modalZoom})`,
              transition: 'none',
              willChange: 'transform',
              width: imageSize.width > 0 ? imageSize.width : 'auto',
              height: imageSize.height > 0 ? imageSize.height : 'auto',
              margin: modalZoom <= 1 ? 'auto' : 0
            }}
          >
            <PreviewCanvas fileHandle={selectedHandle} annotations={selectedAnnotations} options={options} />
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalElement;
  }

  return createPortal(modalElement, document.body);
}
