"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

type RevealProps = {
  children: ReactNode;
  /** Sorszám a listában – egymás után úsznak be (kis késleltetéssel) */
  index?: number;
  className?: string;
};

/** Görgetésre (amikor a képernyőre ér) finoman beúszó tartalom. Animáció-kikapcsolásnál azonnal látszik. */
export function Reveal({ children, index = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Nagyon régi böngésző: azonnal látszik (újrarajzolás nélkül)
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`ct-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--i": index } as CSSProperties}
    >
      {children}
    </div>
  );
}
