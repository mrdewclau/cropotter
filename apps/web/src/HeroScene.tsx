import { useEffect, useRef } from "react";
export function HeroScene() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current!;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let dispose: (() => void) | undefined;
    let cancelled = false;
    function enhance() {
      if (motion.matches || !window.WebGL2RenderingContext) return;
      void import("./scene.js")
        .then((m) => m.mountScene(element))
        .then((cleanup) => {
          if (cancelled || motion.matches) cleanup();
          else dispose = cleanup;
        })
        .catch(() => {});
    }
    const timer = window.setTimeout(enhance, 300);
    function change() {
      dispose?.();
      dispose = undefined;
      if (!motion.matches) enhance();
    }
    motion.addEventListener("change", change);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      motion.removeEventListener("change", change);
      dispose?.();
    };
  }, []);
  return (
    <div className="hero-scene" ref={host} aria-hidden="true">
      <div className="scene-fallback">
        <span className="paper-shadow" />
        <div className="fallback-label">
          <span className="label-micro">A PROPER LITTLE FIT</span>
          <img
            src="/brand/CropOtter-stamp-web.webp"
            width="720"
            height="534"
            alt=""
          />
          <span className="label-rules" />
          <span className="label-micro bottom">FORMATTED / 4 × 6 IN</span>
        </div>
        <span className="scene-tab">4 × 6</span>
      </div>
    </div>
  );
}
