import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load landing (first paint)
import Landing from "./pages/Landing";

// Lazy load all other pages
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
const PublicTree = lazy(() => import("./pages/PublicTree"));
const Diary = lazy(() => import("./pages/Diary"));
const HelpCentre = lazy(() => import("./pages/HelpCentre"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Success = lazy(() => import("./pages/Success"));
const Cancel = lazy(() => import("./pages/Cancel"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Checkout = lazy(() => import("./pages/Checkout"));
const GuestTribute = lazy(() => import("./pages/GuestTribute"));

const PageLoader = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 500,
      networkMode: 'always',
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="flex flex-col min-h-screen">
                <Navigation />
                <main className="flex-grow">
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/auth" element={<Signup />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/verify" element={<Verify />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/memorial/:id" element={<Memorial />} />
                      <Route path="/memorials" element={<Memorials />} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/timeline" element={<Timeline />} />
                      <Route path="/timeline/:id" element={<TimelineView />} />
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/become-creator" element={<ProtectedRoute><BecomeCreator /></ProtectedRoute>} />
                      <Route path="/admin/creator-requests" element={<ProtectedRoute><AdminCreatorRequests /></ProtectedRoute>} />
                      <Route path="/tree" element={<ProtectedRoute><Tree /></ProtectedRoute>} />
                      <Route path="/tree/public/:userId" element={<PublicTree />} />
                      <Route path="/diary" element={<ProtectedRoute><Diary /></ProtectedRoute>} />
                      <Route path="/help" element={<HelpCentre />} />
                      <Route path="/checkout/:templateId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                      <Route path="/success" element={<Success />} />
                      <Route path="/cancel" element={<Cancel />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/guest-tribute/:token" element={<GuestTribute />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </main>
                <Footer />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
