import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Memorial from "./pages/Memorial";
import Memorials from "./pages/Memorials";
import Settings from "./pages/Settings";
import Timeline from "./pages/Timeline";
import TimelineView from "./pages/TimelineView";
import Templates from "./pages/Templates";
import BecomeCreator from "./pages/BecomeCreator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navigation />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/memorial/:id" element={<Memorial />} />
              <Route path="/memorials" element={<Memorials />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/timeline/:id" element={<TimelineView />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/become-creator" element={<BecomeCreator />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
