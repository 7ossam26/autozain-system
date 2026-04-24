import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * ImageGallery — mobile-swipeable, desktop thumbnails.
 * Touch swipe via scroll-snap; buttons for desktop navigation.
 */
export default function ImageGallery({ images }) {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef(null);

  const safe = Array.isArray(images) ? images.filter(Boolean) : [];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.children[index];
    if (slide) slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  if (safe.length === 0) {
    return (
      <div className="aspect-[4/3] bg-background border border-border-muted rounded-md flex items-center justify-center text-text-muted">
        لا توجد صور
      </div>
    );
  }

  function prev() { setIndex((i) => (i === 0 ? safe.length - 1 : i - 1)); }
  function next() { setIndex((i) => (i === safe.length - 1 ? 0 : i + 1)); }

  return (
    <div dir="ltr" className="space-y-2">
      {/* Main */}
      <div className="relative bg-surface border border-border-muted rounded-md overflow-hidden">
        <div
          ref={scrollerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
          onScroll={(e) => {
            const w = e.currentTarget.clientWidth;
            const i = Math.round(e.currentTarget.scrollLeft / w);
            if (i !== index) setIndex(i);
          }}
        >
          {safe.map((url, i) => (
            <div
              key={i}
              className="shrink-0 w-full snap-center"
            >
              <img
                src={url}
                alt=""
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          ))}
        </div>

        {safe.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="السابق"
              className="hidden sm:flex absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 bg-white/90 rounded-full shadow-md items-center justify-center text-text-primary hover:bg-white"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="التالي"
              className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 bg-white/90 rounded-full shadow-md items-center justify-center text-text-primary hover:bg-white"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {safe.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails (desktop only) */}
      {safe.length > 1 && (
        <div className="hidden sm:flex gap-2 overflow-x-auto pb-1">
          {safe.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`shrink-0 w-20 h-14 rounded-sm overflow-hidden border-2 transition-colors ${i === index ? 'border-primary' : 'border-transparent'}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
