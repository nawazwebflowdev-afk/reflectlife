import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Verify from "./pages/Verify";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Memorial from "./pages/Memorial";
import Memorials from "./pages/Memorials";
import Settings from "./pages/Settings";
import Timeline from "./pages/Timeline";
import TimelineView from "./pages/TimelineView";
import Templates from "./pages/Templates";
import BecomeCreator from "./pages/BecomeCreator";
import AdminCreatorRequests from "./pages/AdminCreatorRequests";
import Tree from "./pages/Tree";
import PublicTree from "./pages/PublicTree";
import Diary from "./pages/Diary";
import HelpCentre from "./pages/HelpCentre";
import NotFound from "./pages/NotFound";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Checkout from "./pages/Checkout";
import GuestTribute from "./pages/GuestTribute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache retention
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

const App = () => (
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
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
