import { useEffect, useRef, useState } from "react";
import type { SceneController } from "./scene.js";
const captions = [
  "Start with the full PDF",
  "Keep the label. Leave the page.",
  "A proper 4 × 6. Ready to print.",
];
export function HeroScene() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | undefined>(undefined);
  const [phase, setPhase] = useState(3);
  const [enhanced, setEnhanced] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = host.current!;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let generation = 0;
    let cancelled = false;
    async function enhance() {
      const id = ++generation;
      if (motion.matches || !window.WebGL2RenderingContext) return;
      try {
        const module = await import("./scene.js");
        if (cancelled || id !== generation) return;
        const scene = await module.mountScene(
          element,
          (next) => {
            if (!cancelled && id === generation) setPhase(next);
          },
          () => {
            if (!cancelled && id === generation) setEnhanced(false);
          },
        );
        if (cancelled || motion.matches || id !== generation) scene.dispose();
        else {
          controller.current = scene;
          setEnhanced(true);
        }
      } catch {
        /* The static explanation remains usable. */
      }
    }
    const timer = window.setTimeout(() => void enhance(), 150);
    function change() {
      generation++;
      controller.current?.dispose();
      controller.current = undefined;
      setEnhanced(false);
      setPaused(false);
      setPhase(3);
      if (!motion.matches) void enhance();
    }
    motion.addEventListener("change", change);
    return () => {
      cancelled = true;
      generation++;
      clearTimeout(timer);
      motion.removeEventListener("change", change);
      controller.current?.dispose();
      controller.current = undefined;
    };
  }, []);
  return (
    <div className="demo-stage" data-phase={phase}>
      <div className="demo-topline">
        <span>PDF → 4 × 6</span>
        {enhanced && (
          <button
            className="demo-pause"
            aria-label={paused ? "Play demonstration" : "Pause demonstration"}
            onClick={() => {
              controller.current?.setPaused(!paused);
              setPaused(!paused);
            }}
          >
            <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
            <span>{paused ? "Play" : "Pause"}</span>
          </button>
        )}
      </div>
      <div className="hero-scene" ref={host} aria-hidden="true">
        <div className="scene-fallback">
          <div className="demo-static-label">
            <span>SAMPLE LABEL</span>
            <strong>SHIP TO</strong>
            <b>J. EXAMPLE</b>
            <p>
              123 SAMPLE STREET
              <br />
              ANYTOWN, ST 00000
            </p>
            <div className="static-barcode" />
            <small>4 × 6 IN · READY TO PRINT</small>
          </div>
        </div>
      </div>
      <p className="demo-caption">{captions[phase - 1]}</p>
      <div className="demo-steps" aria-label="Formatting steps">
        {["Full PDF", "Clean crop", "4 × 6 ready"].map((label, i) => (
          <span key={label} data-active={phase === i + 1}>
            <b>0{i + 1}</b>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
