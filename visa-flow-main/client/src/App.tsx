import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageSelector } from "@/components/language-selector";
import { useState, useEffect } from "react";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import NewApplication from "@/pages/new-application";
import ApplicationDetail from "@/pages/application-detail";
import OfficerDashboard from "@/pages/officer-dashboard";
import OfficerApplications from "@/pages/officer-applications";
import OfficerDocuments from "@/pages/officer-documents";
import OfficerInterviews from "@/pages/officer-interviews";
import OfficerReports from "@/pages/officer-reports";
import OfficerSettings from "@/pages/officer-settings";
import AdminPortal from "@/pages/admin-portal";
import ChatBot from "@/pages/chatbot";
import FeedbackPage from "@/pages/feedback";
import VisaVerification from "@/pages/visa-verification";
import VideoInterviews from "@/pages/video-interviews";
import NotFound from "@/pages/not-found";

function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isAdminPortal = location === "/admin";

  // Auto-close on mobile
  useEffect(() => {
    const handler = () => setSidebarOpen(window.innerWidth >= 768);
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f0f4ff", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 40, height: 40, border: "4px solid #ede9ff", borderTop: "4px solid #6c5dd3", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#6c5dd3", fontWeight: 600, fontSize: 14 }}>Loading VisaFlow...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return <Redirect to="/auth" />;

  const isOfficer = user.role === "officer";
  const isAdmin = user.role === "admin";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", background: "#f0f4ff", position: "relative" }}>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="md-hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, display: "none" }}
        />
      )}

      {/* Sidebar with smooth animation */}
      {!isAdminPortal && (
        <div style={{
          width: sidebarOpen ? 240 : 0,
          minWidth: sidebarOpen ? 240 : 0,
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          flexShrink: 0,
          zIndex: 50,
        }}>
          <AppSidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top bar with hamburger */}
        <div style={{
          height: 52, background: "#fff", borderBottom: "1px solid #e8edf8",
          display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
          position: "sticky", top: 0, zIndex: 30, flexShrink: 0,
        }}>
          {!isAdminPortal && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8",
                background: "#f8f9ff", cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 5, flexShrink: 0,
                transition: "background 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#ede9ff"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#f8f9ff"}
              aria-label="Toggle sidebar"
            >
              <span style={{ display: "block", width: 16, height: 2, background: "#6c5dd3", borderRadius: 2, transition: "all 0.2s", transform: sidebarOpen ? "rotate(0)" : "rotate(0)" }} />
              <span style={{ display: "block", width: 16, height: 2, background: "#6c5dd3", borderRadius: 2, transition: "all 0.2s", opacity: sidebarOpen ? 1 : 1 }} />
              <span style={{ display: "block", width: 16, height: 2, background: "#6c5dd3", borderRadius: 2, transition: "all 0.2s" }} />
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3dd598", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#a0aec0", fontWeight: 600, letterSpacing: "0.08em" }}>SYSTEM ONLINE</span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#a0aec0" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <div style={{ width: 1, height: 20, background: "#e8edf8" }} />
            <LanguageSelector variant="light" />
            <div style={{ width: 1, height: 20, background: "#e8edf8" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", background: "#f8f9ff", borderRadius: 10, border: "1px solid #e8edf8" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#6c5dd3", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                {user.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2035" }}>{user.fullName?.split(" ")[0]}</div>
                <div style={{ fontSize: 10, color: "#a0aec0", textTransform: "capitalize" }}>{user.role}</div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>

        <main style={{ flex: 1, overflow: "auto", background: "#f0f4ff" }}>
          <Switch>
            <Route path="/">
              {isAdmin ? <Redirect to="/admin" /> : isOfficer ? <Redirect to="/officer" /> : <Dashboard />}
            </Route>
            <Route path="/dashboard">
              {isAdmin ? <Redirect to="/admin" /> : isOfficer ? <Redirect to="/officer" /> : <Dashboard />}
            </Route>
            <Route path="/applications/new">
              {isAdmin || isOfficer ? <Redirect to="/officer/applications" /> : <NewApplication />}
            </Route>
            <Route path="/applications/:id" component={ApplicationDetail} />
            <Route path="/chat" component={ChatBot} />
            <Route path="/interviews">
              {isAdmin || isOfficer ? <OfficerInterviews /> : <VideoInterviews />}
            </Route>
            <Route path="/feedback">
              {isAdmin || isOfficer ? <Redirect to="/officer" /> : <FeedbackPage />}
            </Route>

            {/* Officer Routes */}
            <Route path="/officer">
              {isAdmin || isOfficer ? <OfficerDashboard /> : <Redirect to="/dashboard" />}
            </Route>
            <Route path="/officer/applications">
              {isAdmin || isOfficer ? <OfficerApplications /> : <Redirect to="/dashboard" />}
            </Route>
            <Route path="/officer/documents">
              {isAdmin || isOfficer ? <OfficerDocuments /> : <Redirect to="/dashboard" />}
            </Route>
            <Route path="/officer/interviews">
              {isAdmin || isOfficer ? <OfficerInterviews /> : <Redirect to="/dashboard" />}
            </Route>
            <Route path="/officer/reports">
              {isAdmin || isOfficer ? <OfficerReports /> : <Redirect to="/dashboard" />}
            </Route>
            <Route path="/officer/settings">
              {isAdmin || isOfficer ? <OfficerSettings /> : <Redirect to="/dashboard" />}
            </Route>

            {/* Admin Portal */}
            <Route path="/admin">
              {isAdmin ? <AdminPortal /> : <Redirect to="/dashboard" />}
            </Route>

            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh" }}>
      <div style={{ width:36,height:36,border:"4px solid #ede9ff",borderTop:"4px solid #6c5dd3",borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify/:visaNumber" component={VisaVerification} />
      <Route><ProtectedLayout /></Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
