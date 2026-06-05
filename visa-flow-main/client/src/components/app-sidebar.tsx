import { useLocation, Link } from "wouter";
import { LogOut, Globe, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface NavItem { title: string; url: string; icon: string; id: string; badge?: string; }

const applicantNav: NavItem[] = [
  { title: "Dashboard",        url: "/dashboard",        icon: "🏠", id: "dashboard" },
  { title: "New Application",  url: "/applications/new", icon: "📋", id: "applications" },
  { title: "AI Assistant",     url: "/chat",             icon: "💬", id: "chat" },
  { title: "Interviews",       url: "/interviews",       icon: "🎥", id: "interviews", badge: "interviews" },
  { title: "Feedback",         url: "/feedback",         icon: "📝", id: "feedback" },
];

const officerNavMain: NavItem[] = [
  { title: "Dashboard",    url: "/officer",              icon: "🏠", id: "dashboard" },
  { title: "Documents",    url: "/officer/documents",    icon: "📁", id: "documents" },
  { title: "Interviews",   url: "/officer/interviews",   icon: "🎥", id: "interviews", badge: "interviews" },
];

const officerNavAnalytics: NavItem[] = [
  { title: "Reports",  icon: "📊", url: "/officer/reports",  id: "reports" },
  { title: "Settings", icon: "⚙️", url: "/officer/settings", id: "settings" },
];

const adminNav: NavItem[] = [
  //{ title: "Overview",     url: "/admin",       icon: "📊", id: "overview" },
  //{ title: "Applications", url: "/admin",       icon: "📋", id: "applications", badge: "applications" },
  //{ title: "Officers",     url: "/admin",       icon: "🛡️", id: "officers" },
  //{ title: "Applicants",   url: "/admin",       icon: "👥", id: "applicants" },
  //{ title: "Reports",      url: "/admin",       icon: "📈", id: "reports" },
  //{ title: "Feedbacks",   url: "/admin",       icon: "📝", id: "feedbacks" },
  //{ title: "System",       url: "/admin",       icon: "⚙️", id: "system" },
];

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [location] = useLocation();
  const isOfficer = user?.role === "officer";
  const isAdmin = user?.role === "admin";

  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["sidebar-apps"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const url = isAdmin || isOfficer ? "/api/applications/all" : "/api/applications";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: interviews = [] } = useQuery<any[]>({
    queryKey: ["sidebar-interviews"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/interviews", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  const pendingApps = (applications as any[]).filter(a => a.status === "pending").length;
  const scheduledIvs = (interviews as any[]).filter(i => i.status === "scheduled").length;

  const initials = user?.fullName?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
  const avatarColors = ["#6c5dd3","#3dd598","#ff9f43","#4d9de0","#ff6b6b"];
  const avatarColor = avatarColors[(user?.fullName?.charCodeAt(0) || 0) % avatarColors.length];

  const navItems = isAdmin ? adminNav : isOfficer ? officerNavMain : applicantNav;
  const analyticsItems = (isOfficer && !isAdmin) ? officerNavAnalytics : [];

  const isActive = (item: NavItem) => {
    if (item.url === "/officer" && location === "/officer") return true;
    if (item.url === "/admin" && location === "/admin") return true;
    if (item.url !== "/officer" && item.url !== "/admin" && item.url !== "/" && location === item.url) return true;
    if (item.url !== "/officer" && item.url !== "/admin" && item.url.length > 1 && location.startsWith(item.url)) return true;
    if ((item.url === "/dashboard" || item.url === "/") && (location === "/" || location === "/dashboard")) return true;
    return false;
  };

  const getBadge = (badge?: string) => {
    if (badge === "applications") return pendingApps;
    if (badge === "interviews") return scheduledIvs;
    return 0;
  };

  const navTitleMap: Record<string, string> = {
    dashboard: t("sidebar.dashboard"),
    applications: t("sidebar.applications"),
    aiAssistant: t("sidebar.aiAssistant"),
    chat: t("sidebar.aiAssistant"),
    interviews: t("sidebar.interviews"),
    feedback: t("sidebar.feedback"),
    documents: t("sidebar.documents"),
    reports: t("sidebar.reports"),
    settings: t("sidebar.settings"),
    overview: t("sidebar.overview"),
    officers: t("sidebar.officers"),
    applicants: t("sidebar.applicants"),
    system: t("sidebar.system"),
  };

  const NavItem = ({ item }: { item: NavItem }) => {
    const active = isActive(item);
    const count = getBadge(item.badge);
    const label = navTitleMap[item.id] || item.title;
    return (
      <Link href={item.url}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
            borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
            background: active ? "#6c5dd3" : "transparent",
            color: active ? "#fff" : "#94a3b8",
          }}
          onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color="#fff"; }}}
          onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color="#94a3b8"; }}}
        >
          <span style={{ fontSize: 16, lineHeight: 1, width: 20, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
          <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, flex: 1 }}>{label}</span>
          {count > 0 && (
            <span style={{ background: active ? "rgba(255,255,255,0.25)" : "#ff9f43", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, minWidth: 20, textAlign: "center" }}>
              {count}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div style={{ width: 240, height: "100%", background: "#1a2035", display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6c5dd3,#4d9de0)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Globe style={{ width: 18, height: 18, color: "#fff" }} />
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, lineHeight: 1 }}>VisaFlow</div>
          <div style={{ color: "#4a5568", fontSize: 10, marginTop: 2, fontWeight: 500 }}>
            {isAdmin ? t("admin.title") : isOfficer ? t("officer.dashboard") : t("sidebar.dashboard")}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#3d4a6a", padding: "4px 8px 6px", textTransform: "uppercase" }}>
          {isAdmin ? "Admin" : "Main"}
        </div>
        {navItems.map(item => <NavItem key={item.id} item={item} />)}

        {analyticsItems.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#3d4a6a", padding: "14px 8px 6px", textTransform: "uppercase" }}>Analytics</div>
            {analyticsItems.map(item => <NavItem key={item.id} item={item} />)}
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        {/* Dark mode */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background="transparent"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🌙</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{theme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")}</span>
          </div>
          <div style={{ width: 38, height: 20, borderRadius: 99, background: theme === "dark" ? "#6c5dd3" : "#374151", position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", left: theme === "dark" ? 20 : 2 }} />
          </div>
        </button>

        {/* Sign out */}
        <button
          onClick={logout}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", background: "rgba(255,107,107,0.1)", cursor: "pointer", color: "#ff6b6b", marginTop: 4 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="rgba(255,107,107,0.2)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background="rgba(255,107,107,0.1)"}
        >
          <LogOut style={{ width: 15, height: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t("sidebar.logout")}</span>
        </button>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", marginTop: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.fullName}</div>
            <div style={{ color: "#4a5568", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.assignedCountry ? `${user.assignedCountry} Officer` : user?.role === "admin" ? "System Administrator" : "Applicant"}
            </div>
          </div>
          <ChevronRight style={{ width: 12, height: 12, color: "#4a5568", flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
