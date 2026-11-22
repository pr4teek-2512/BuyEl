"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Single line of text that scrolls sideways on its own when it is too long to
 * fit, and sits still when it fits. Replaces `truncate` for course names.
 */
export function Marquee({ children, className }: { children: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    function measure() {
      if (!box.current || !text.current) return;
      setDistance(Math.max(0, text.current.scrollWidth - box.current.clientWidth));
    }
    measure();

    // The row resizes, and so does the text itself once the web font replaces
    // the fallback one. Measuring only the row leaves a stale distance behind.
    const observer = new ResizeObserver(measure);
    if (box.current) observer.observe(box.current);
    if (text.current) observer.observe(text.current);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => observer.disconnect();
  }, [children]);

  return (
    <div ref={box} className={cn("buyel-marquee-box overflow-hidden whitespace-nowrap", className)}>
      <span
        ref={text}
        className={cn("inline-block", distance > 0 && "buyel-marquee")}
        style={
          distance > 0
            ? ({
                "--marquee-distance": `-${distance}px`,
                "--marquee-duration": `${Math.max(4, distance / 20 + 3)}s`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </span>
    </div>
  );
}
