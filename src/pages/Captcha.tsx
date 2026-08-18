import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsRight, Check } from "lucide-react";
import Index from "./Index";



const Captcha = () => {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const startXRef = useRef(0);
  const startPosRef = useRef(0);
  const KNOB = 44;

  const maxX = () => {
    const w = trackRef.current?.clientWidth ?? 0;
    return Math.max(0, w - KNOB - 8);
  };

  const finish = () => {
    setDone(true);
    setTimeout(() => navigate("/homepage"), 500);
  };

  const onDown = (clientX: number) => {
    if (done) return;
    setDragging(true);
    startXRef.current = clientX;
    startPosRef.current = x;
  };
  const onMove = (clientX: number) => {
    if (!dragging || done) return;
    const next = Math.min(maxX(), Math.max(0, startPosRef.current + (clientX - startXRef.current)));
    setX(next);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (x >= maxX() - 4) {
      setX(maxX());
      finish();
    } else {
      setX(0);
    }
  };

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive, nosnippet, noimageindex";
    document.head.appendChild(meta);
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    return () => {
      document.head.removeChild(meta);
      document.removeEventListener("contextmenu", prevent);
    };
  }, []);

  useEffect(() => {
    const mm = (e: MouseEvent) => onMove(e.clientX);
    const mu = () => onUp();
    const tm = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const tu = () => onUp();
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    window.addEventListener("touchmove", tm);
    window.addEventListener("touchend", tu);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", mu);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchend", tu);
    };
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef2f8]">
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none blur-md scale-105 select-none">
        <Index />
      </div>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">


        <div className="w-full max-w-[420px] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xl">
          <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
            <h1 className="text-[#001f5b] text-[18px] font-semibold leading-none">
              Sicherheitsüberprüfung
            </h1>
          </header>


          <div className="bg-[#eef2f8] px-5 py-6">
            <div className="text-center">
              <p className="text-[14px] font-semibold text-[#0f172a]">
                Bitte bestätigen Sie, dass Sie kein Roboter sind
              </p>
              <p className="text-[12px] text-slate-500 mt-1">
                Schieben Sie den Regler nach rechts, um fortzufahren.
              </p>

              <div
                ref={trackRef}
                className="relative mx-auto mt-5 h-[52px] w-full rounded-lg bg-white border border-slate-200 shadow-sm select-none"
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-lg bg-[#e2ecf8] transition-[width] duration-75"
                  style={{ width: `${x + KNOB + 4}px`, opacity: done ? 1 : 0.9 }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[13px] text-slate-500">
                    {done ? "Bestätigt" : "Nach rechts schieben →"}
                  </span>
                </div>
                <div
                  role="button"
                  aria-label="Regler nach rechts schieben"
                  onMouseDown={(e) => onDown(e.clientX)}
                  onTouchStart={(e) => onDown(e.touches[0].clientX)}
                  className={`absolute top-1 left-1 h-[44px] w-[44px] rounded-md bg-white border border-slate-200 shadow-md flex items-center justify-center ${
                    done ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                  }`}
                  style={{ transform: `translateX(${x}px)`, transition: dragging ? "none" : "transform 200ms ease" }}
                >
                  {done ? (
                    <Check className="h-5 w-5 text-[#2e7d32]" />
                  ) : (
                    <ChevronsRight className="h-5 w-5 text-[#001f5b]" />
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-5">
                Diese Prüfung schützt vor automatisierten Zugriffen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Captcha;
