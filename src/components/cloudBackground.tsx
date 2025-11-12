"use client";
import React, { useEffect, useMemo, useState } from "react";

type ThemeKey = "modern" | "classic";

interface Cloud {
  id: string;
  left: number; // % left
  top: number; // % top
  scale: number;
  opacity: number;
  shadeIndex: number;
  duration: number; // seconds for float loop
  delay: number; // seconds before animation starts
  size: number; // approximate width in px
  driftX: number; // px horizontal drift amount across animation
}

export default function CloudBackground({ theme = "modern", density = 7 }: { theme?: ThemeKey; density?: number }) {
  // density: number of clouds (default 7)
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // palettes for shades of blue for modern/classic
  const palettes: Record<ThemeKey, string[]> = {
    modern: ["#E6F2FA", "#CFEBF8", "#B7E3F6", "#89D1F0", "#5FBCE9"],
    classic:[ "#EAF3FF", "#D7ECFF", "#BFDFFF", "#99D1FF", "#6ABEFF" ],
  };

  const shades = palettes[theme];

  // Utility: random in range
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

  // Generate cloud set (random)
  useEffect(() => {
    const count = Math.max(3, density); // ensure minimum
    const out: Cloud[] = [];
    const timestamp = Date.now();
    for (let i = 0; i < count; i++) {
      const left = rand(-10, 90); // allow some off-screen start
      const top = rand(2, 60); // vertical spread
      const scale = rand(0.7, 1.6);
      const opacity = rand(0.45, 0.95);
      const shadeIndex = randInt(0, shades.length - 1);
      const duration = rand(18, 36); // seconds for loop
      const delay = rand(-duration, 8); // can start already mid-way
      const size = rand(120, 420);
      const driftX = rand(30, 240); // horizontal drift in px across animation
      out.push({
        id: `${timestamp}-${i}`,
        left,
        top,
        scale,
        opacity,
        shadeIndex,
        duration,
        delay,
        size,
        driftX,
      });
    }
    setClouds(out);
    // regenerate each time theme or density changes
  }, [theme, density]);

  // Periodically respawn one cloud for pop-up effect (optional)
  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setClouds((prev) => {
        const copy = [...prev];
        // remove a random cloud and add new one at front
        if (copy.length > 0) copy.splice(randInt(0, copy.length - 1), 1);
        const timestamp = Date.now();
        const newCloud: Cloud = {
          id: `${timestamp}-r`,
          left: rand(-10, 90),
          top: rand(2, 60),
          scale: rand(0.7, 1.6),
          opacity: rand(0.45, 0.95),
          shadeIndex: randInt(0, shades.length - 1),
          duration: rand(18, 36),
          delay: rand(0, 3),
          size: rand(100, 380),
          driftX: rand(30, 240),
        };
        copy.push(newCloud);
        return copy;
      });
    }, 7000); // every 7s respawn one
    return () => clearInterval(interval);
  }, [prefersReducedMotion, shades.length]);

  // Cloud SVG: simple cluster of circles with subtle shadow
  const CloudSVG = ({ fill }: { fill: string }) => (
    <svg viewBox="0 0 200 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <filter id="cloudShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="shadowBlur" />
          <feOffset dx="0" dy="4" result="shadowOffset" />
          <feMerge>
            <feMergeNode in="shadowOffset" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#cloudShadow)">
        <ellipse cx="70" cy="68" rx="50" ry="28" fill={fill} />
        <circle cx="110" cy="56" r="30" fill={fill} />
        <circle cx="46" cy="52" r="24" fill={fill} />
        <ellipse cx="86" cy="76" rx="68" ry="20" fill={fill} opacity="0.98" />
      </g>
    </svg>
  );

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        style={{ isolation: "isolate" }}
      >
        <div className="relative w-full h-full">
          {/* Cloud layer */}
          {clouds.map((c, idx) => {
            const bg = shades[c.shadeIndex];
            // inline transform values for initial position + scale
            const left = `${c.left}%`;
            const top = `${c.top}%`;
            const transform = `translate(-50%, -50%) scale(${c.scale})`;
            const style: React.CSSProperties = {
              position: "absolute",
              left,
              top,
              width: `${c.size}px`,
              height: `${(c.size * 0.6) | 0}px`,
              opacity: c.opacity,
              transform,
              // use GPU-accelerated transforms for smoothness
              willChange: "transform, opacity",
            };

            // Anim inline CSS variables so keyframes can reference them
            const styleVars: React.CSSProperties = {
              ...style,
              // custom properties for animation
              // float duration/offset/distance
              ["--float-duration" as any]: `${c.duration}s`,
              ["--float-delay" as any]: `${c.delay}s`,
              ["--drift-x" as any]: `${c.driftX}px`,
            };

            return (
              <div
                key={c.id}
                className={`cloud-item ${prefersReducedMotion ? "reduced" : ""}`}
                style={styleVars}
              >
                <div style={{ width: "100%", height: "100%" }}>
                  <CloudSVG fill={bg} />
                </div>
                <style>{`
                  .cloud-item {
                    transform-origin: center;
                    transition: opacity 0.6s ease;
                  }
                  /* pop-in animation (scale from 0.85 -> 1) and gentle float */
                  @keyframes cloud-pop {
                    0% {
                      opacity: 0;
                      transform: translate(-50%, -50%) scale(0.85);
                    }
                    60% {
                      opacity: 0.95;
                      transform: translate(-50%, -50%) scale(1.02);
                    }
                    100% {
                      opacity: 1;
                      transform: translate(-50%, -50%) scale(1);
                    }
                  }
                  @keyframes cloud-float {
                    /* move horizontally by --drift-x and slight vertical bob */
                    0% {
                      transform: translate(calc(-50% - var(--drift-x)), -50%) translateZ(0);
                    }
                    50% {
                      transform: translate(calc(-50% + calc(var(--drift-x) / 2)), calc(-50% + 6px)) translateZ(0);
                    }
                    100% {
                      transform: translate(calc(-50% - var(--drift-x)), -50%) translateZ(0);
                    }
                  }
                  .cloud-item:not(.reduced) {
                    animation:
                      cloud-pop 900ms cubic-bezier(0.2, 0.9, 0.3, 1) var(--float-delay) both,
                      cloud-float var(--float-duration) linear var(--float-delay) infinite;
                  }
                  .cloud-item.reduced {
                    animation: none;
                    transition: none;
                  }
                `}</style>
              </div>
            );
          })}
        </div>
      </div>

      {/* Small global style to ensure background doesn't overlap interactive elements */}
      <style jsx global>{`
        /* ensure the background is behind everything */
        .-z-10 {
          z-index: -10 !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .cloud-item {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}