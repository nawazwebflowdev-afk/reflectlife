import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import LanguageAlternates from "./components/LanguageAlternates";
import { langFromPath } from "./i18n/langPath";
import SeasonalBanner from "./components/SeasonalBanner";

const DonationThanks = lazy(() => import("./pages/DonationThanks"));
const FundraiserDashboard = lazy(() => import("./pages/FundraiserDashboard"));
const AdminFundraisers = lazy(() => import("./pages/AdminFundraisers"));
const CookieConsent = lazy(() => import("./components/CookieConsent"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const Verify = lazy(() => import("./pages/Verify"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Memorial = lazy(() => import("./pages/Memorial"));
const Memorials = lazy(() => import("./pages/Memorials"));
const Settings = lazy(() => import("./pages/Settings"));
const Timeline = lazy(() => import("./pages/Timeline"));
const TimelineView = lazy(() => import("./pages/TimelineView"));
const Templates = lazy(() => import("./pages/Templates"));
const BecomeCreator = lazy(() => import("./pages/BecomeCreator"));
const AdminCreatorRequests = lazy(() => import("./pages/AdminCreatorRequests"));
const Tree = lazy(() => import("./pages/Tree"));
const Diary = lazy(() => import("./pages/Diary"));
const HelpCentre = lazy(() => import("./pages/HelpCentre"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Success = lazy(() => import("./pages/Success"));
const Cancel = lazy(() => import("./pages/Cancel"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const QA = lazy(() => import("./pages/QA"));
const About = lazy(() => import("./pages/About"));
const CandleSuccess = lazy(() => import("./pages/CandleSuccess"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const RemembrancePage = lazy(() => import("./pages/Remembrance"));
const RemembranceDetail = lazy(() => import("./pages/RemembranceDetail"));
const DonationSuccess = lazy(() => import("./pages/DonationSuccess"));
const CampaignDashboard = lazy(() => import("./pages/CampaignDashboard"));
const Terms = lazy(() => import("./pages/Terms"));
const UkrainianMemorialLanding = lazy(() => import("./pages/UkrainianMemorialLanding"));
const InfoBoard = lazy(() => import("./pages/InfoBoard"));
const InfoItemPage = lazy(() => import("./pages/InfoItemPage"));
const InfoSupport = lazy(() => import("./pages/InfoSupport"));
const AdminInfo = lazy(() => import("./pages/AdminInfo"));
const Imprint = lazy(() => import("./pages/Imprint"));

const urlLang = langFromPath(window.location.pathname);
const routerBasename = urlLang ? `/${urlLang}` : undefined;

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={routerBasename}>
          <LanguageAlternates />
          <div className="flex flex-col min-h-screen">
            <Navigation />
            <SeasonalBanner />
            <main className="flex-grow">
              <Suspense fallback={<div className="min-h-[50vh]" aria-hidden="true" />}>
                <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/uk/pamiat" element={<UkrainianMemorialLanding />} />
                <Route path="/auth" element={<Signup />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/memorial/:id" element={<Memorial />} />
                <Route path="/memorials" element={<Memorials />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/timeline/:id" element={<TimelineView />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/become-creator" element={<BecomeCreator />} />
                <Route path="/admin/creator-requests" element={<AdminCreatorRequests />} />
                <Route path="/tree" element={<Tree />} />
                <Route path="/diary" element={<Diary />} />
                <Route path="/remembrance" element={<RemembrancePage />} />
                <Route path="/remembrance/:id" element={<RemembranceDetail />} />
                <Route path="/help" element={<HelpCentre />} />
                <Route path="/checkout/:templateId" element={<Checkout />} />
                <Route path="/success" element={<Success />} />
                <Route path="/cancel" element={<Cancel />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="/qa" element={<QA />} />
                <Route path="/about" element={<About />} />
                <Route path="/candle-success" element={<CandleSuccess />} />
                <Route path="/donation-success" element={<DonationSuccess />} />
                <Route path="/donation-thanks" element={<DonationThanks />} />
                <Route path="/fundraiser-dashboard/:memorialId" element={<FundraiserDashboard />} />
                <Route path="/admin/fundraisers" element={<AdminFundraisers />} />
                <Route path="/campaign-dashboard/:id" element={<CampaignDashboard />} />
                <Route path="/info" element={<InfoBoard />} />
                <Route path="/info/:slug" element={<InfoItemPage />} />
                <Route path="/support" element={<InfoSupport />} />
                <Route path="/admin" element={<AdminInfo />} />
                <Route path="/stories" element={<Navigate to="/info" replace />} />
                <Route path="/stories/*" element={<Navigate to="/info" replace />} />
                <Route path="/admin/content" element={<Navigate to="/admin" replace />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/imprint" element={<Imprint />} />
                <Route path="/impressum" element={<Imprint />} />
                <Route path="/aviso-legal" element={<Imprint />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <Suspense fallback={null}><CookieConsent /></Suspense>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
