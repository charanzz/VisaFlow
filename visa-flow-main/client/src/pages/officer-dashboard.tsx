import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import {
  Shield, Search, Users, ArrowRight, Activity,
  UserPlus, Trash2, Database, BarChart3, Globe,
  CheckCircle2, XCircle, Clock, AlertTriangle, MessageSquarePlus,
  FileText, Image as ImageIcon, Landmark, ShieldCheck, ShieldAlert, Eye, EyeOff, Copy,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { Placeholder } from "drizzle-orm";
import { useTranslation } from "react-i18next";

interface Application {
  id: number; userId: number; applicationType: string; visaType: string;
  purposeOfVisit: string; destinationCountry: string;
  intendedEntryDate: string | null; intendedExitDate: string | null;
  status: string; currentStage: number; riskScore: number | null;
  riskLevel: string | null; aiAnalysisSummary: string | null;
  officerNotes: string | null; createdAt: string;
  applicantName?: string;
}
interface UserRecord {
  id: number; fullName: string; email: string; role: string;
  assignedCountry: string | null; plainPassword: string | null;
  emailVerified: boolean; createdAt: string;
}
interface FeedbackRecord {
  id: number; userId: number; userName: string; userEmail: string;
  message: string; createdAt: string;
}
interface Stats {
  total: number; pending: number; granted: number; denied: number;
  inReview: number; blockchainEntries: number; highRisk: number;
}
interface DocumentRecord {
  id: number; applicationId: number; documentType: string; fileName: string;
  fileUrl: string | null; fileSize: number; mimeType: string; verified: boolean;
  aiConfidenceScore: number | null; aiVerificationNotes: string | null;
  extractedData: Record<string, string> | null; uploadedAt: string;
}

const COUNTRIES = ["USA","China","UK","Canada","Australia","India","Germany","France","Japan","Brazil","Mexico","Russia"];

function getStatusBadge(status: string, t: (k: string) => string) {
  const map: Record<string, { cls: string; key: string; dot: string }> = {
    pending:          { cls: "badge-pending",    key: "dashboard.status.pending",         dot: "#d4a000" },
    document_review:  { cls: "badge-review",     key: "dashboard.status.document_review", dot: "#6c5dd3" },
    security_check:   { cls: "badge-security",   key: "dashboard.status.security_check",  dot: "#9333ea" },
    risk_assessment:  { cls: "badge-review",     key: "dashboard.status.risk_assessment", dot: "#6c5dd3" },
    blockchain_entry: { cls: "badge-blockchain", key: "dashboard.status.blockchain_entry",dot: "#0084b4" },
    granted:          { cls: "badge-granted",    key: "dashboard.status.granted",         dot: "#00a86b" },
    denied:           { cls: "badge-denied",     key: "dashboard.status.denied",          dot: "#e53535" },
  };
  const cfg = map[status] || { cls: "badge-pending", key: "", dot: "#888" };
  return (
    <span className={cfg.cls}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.key ? t(cfg.key) : status}
    </span>
  );
}

function RiskBar({ score, level }: { score: number | null; level: string | null }) {
  if (score === null) return <span style={{ color: "#a0aec0", fontSize: 13 }}>—</span>;
  const color = level === "high" ? "#ff6b6b" : level === "medium" ? "#ff9f43" : "#3dd598";
  return (
    <div className="flex items-center gap-2">
      <div className="risk-track" style={{ width: 64 }}>
        <div className="risk-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{score.toFixed(0)}%</span>
    </div>
  );
}

function AvatarCircle({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ["#6c5dd3","#3dd598","#ff9f43","#4d9de0","#ff6b6b","#ffd166"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35,
      fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function OfficerDashboard() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionType, setActionType] = useState<"grant" | "deny" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [createOfficerOpen, setCreateOfficerOpen] = useState(false);
  const [visibleCredentials, setVisibleCredentials] = useState<Set<number>>(new Set());
  const [newOfficer, setNewOfficer] = useState({ fullName: "", email: "", password: "", country: "" });
  const [viewDocsApp, setViewDocsApp] = useState<Application | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: scheduledInterviews = [] } = useQuery<any[]>({
    queryKey: ["officer-interviews-notif"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/interviews", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((i: any) => i.status === "scheduled");
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const appsQuery = useQuery<Application[]>({ queryKey: ["/api/applications/all"] });
  const usersQuery = useQuery<UserRecord[]>({ queryKey: ["/api/admin/users"], enabled: isAdmin });
  const statsQuery = useQuery<Stats>({ queryKey: ["/api/stats/overview"] });
  const feedbackQuery = useQuery<FeedbackRecord[]>({ queryKey: ["/api/feedback"], enabled: isAdmin });
  const docsQuery = useQuery<DocumentRecord[]>({
    queryKey: [`/api/applications/${viewDocsApp?.id}/documents`],
    enabled: !!viewDocsApp,
    staleTime: 0,
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ id, action, notes, reason }: { id: number; action: "grant"|"deny"; notes: string; reason?: string }) => {
      const path = action === "grant" ? `/api/officer/applications/${id}/grant` : `/api/officer/applications/${id}/deny`;
      return (await apiRequest("POST", path, { notes, reason })).json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/overview"] });
      toast({ title: vars.action === "grant" ? "✅ Visa Granted!" : "❌ Application Denied" });
      setSelectedApp(null); setActionType(null); setActionNote(""); setDenialReason("");
    },
    onError: () => toast({ title: "Error", description: "Decision failed.", variant: "destructive" }),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) =>
      (await apiRequest("POST", `/api/admin/users/${id}/role`, { role })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Role Updated" }); },
  });

  const deleteAppMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/admin/applications/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/overview"] });
      toast({ title: "Application Deleted" });
    },
    onError: () => toast({ title: "Delete Failed", variant: "destructive" }),
  });

  const assignCountryMutation = useMutation({
    mutationFn: async ({ id, country }: { id: number; country: string }) =>
      (await apiRequest("POST", `/api/admin/users/${id}/assign-country`, { country })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Country Assigned" }); },
  });

  const deleteOfficerMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/officers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Officer Deleted" }); },
    onError: (err: Error) => toast({ title: "Delete Failed", description: err.message, variant: "destructive" }),
  });

  const verifyDocMutation = useMutation({
    mutationFn: async ({ docId, documentType, fileName }: { docId: number; documentType: string; fileName: string }) =>
      (await apiRequest("POST", `/api/documents/${docId}/verify`, { documentType, fileName })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${viewDocsApp?.id}/documents`] });
    },
    onError: () => toast({ title: "Verification Failed", variant: "destructive" }),
  });

  const [verifyingAll, setVerifyingAll] = useState(false);
  const handleVerifyAll = async () => {
    const unverified = (docsQuery.data ?? []).filter(d => !d.verified);
    if (unverified.length === 0) return;
    setVerifyingAll(true);
    try {
      for (const doc of unverified) {
        await apiRequest("POST", `/api/documents/${doc.id}/verify`, { documentType: doc.documentType, fileName: doc.fileName });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${viewDocsApp?.id}/documents`] });
      toast({ title: "All Documents Verified" });
    } catch {
      toast({ title: "Verification Failed", variant: "destructive" });
    } finally {
      setVerifyingAll(false);
    }
  };

  const createOfficerMutation = useMutation({
    mutationFn: async (data: typeof newOfficer) => {
      const res = await apiRequest("POST", "/api/admin/officers", data);
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed to create officer"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Officer Created", description: `${newOfficer.fullName} added.` });
      setCreateOfficerOpen(false);
      setNewOfficer({ fullName: "", email: "", password: "", country: "" });
    },
    onError: (e: any) => toast({ title: "Creation Failed", description: e.message, variant: "destructive" }),
  });

  const apps = appsQuery.data || [];
  const allUsers = usersQuery.data || [];
  const stats = statsQuery.data;
  const applicants = allUsers.filter(u => u.role === "applicant");
  const officers = allUsers.filter(u => u.role === "officer");

  const filtered = apps.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.visaType.includes(q) || a.destinationCountry.toLowerCase().includes(q) || String(a.id).includes(q) || (a.applicantName || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchCountry = filterCountry === "all" || a.destinationCountry === filterCountry;
    return matchSearch && matchStatus && matchCountry;
  });

  // Visa type breakdown for donut chart
  const visaTypes = ["tourist","student","work","business","transit"];
  const visaColors = ["#6c5dd3","#3dd598","#ff9f43","#ff6b6b"];
  const visaBreakdown = visaTypes.map((t, i) => ({
    type: t, count: apps.filter(a => a.visaType === t).length, color: visaColors[i % visaColors.length],
  })).filter(v => v.count > 0);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      {/* ── Page Header ── */}
      <div className="vf-header">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a2035" }}>
            {currentUser?.assignedCountry || (isAdmin ? t("admin.title") : "")} {t("officer.immigration")}{" "}
            <span style={{ color: "#6c5dd3" }}>{t("officer.dashboard")}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#a0aec0" }} />
            <input
              placeholder="Search applications, visa type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, paddingRight: 12, height: 36, border: "1px solid #e8edf8", borderRadius: 10,
                fontSize: 13, color: "#1a2035", background: "#f8f9ff", outline: "none", width: 240 }}
            />
          </div>
          <div ref={notifRef} style={{ position: "relative" }}>
            
            {notifOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, background: "#fff", border: "1px solid #e8edf8", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 1000, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f4ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1a2035" }}>🎥 Video Call Requests</span>
                  <span style={{ background: "#ede9ff", color: "#6c5dd3", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{scheduledInterviews.length} scheduled</span>
                </div>
                {scheduledInterviews.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "#a0aec0", fontSize: 13 }}>No video call bookings</div>
                ) : (
                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {scheduledInterviews.map((iv: any) => (
                      <div key={iv.id} style={{ padding: "10px 16px", borderBottom: "1px solid #f0f4ff", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ede9ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🎥</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#1a2035", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {iv.applicantName || `Applicant #${iv.applicantId}`}
                          </div>
                          <div style={{ fontSize: 11, color: "#a0aec0" }}>
                            {new Date(iv.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {new Date(iv.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                        <span style={{ background: "#ede9ff", color: "#6c5dd3", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>Scheduled</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f4ff" }}>
                  <Link href="/officer/interviews">
                    <button onClick={() => setNotifOpen(false)} style={{ width: "100%", height: 32, background: "#6c5dd3", color: "#fff", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      View All Interviews →
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {isAdmin && (
            <button
              onClick={() => setCreateOfficerOpen(true)}
              style={{ height: 36, padding: "0 16px", background: "#6c5dd3", color: "#fff", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              data-testid="button-create-officer"
            >
              <UserPlus style={{ width: 14, height: 14 }} /> {t("officer.newOfficer")}
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "20px 24px", maxWidth: 1280, margin: "0 auto" }}>
        {/* ── Welcome Banner ── */}
        <div className="vf-banner" style={{ padding: "24px 28px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
              {t("officer.welcomeBack")}, {currentUser?.fullName?.split(" ")[0]} 👋
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {currentUser?.assignedCountry ? `${currentUser.assignedCountry} ${t("officer.immigration")}` : t("admin.title")} · {today}
            </div>
          </div>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              { label: t("dashboard.stats.pending"),  value: stats?.pending ?? 0,  color: "#fff" },
              { label: t("dashboard.stats.granted"),  value: stats?.granted ?? 0,  color: "#3dd598" },
              { label: t("sidebar.interviews"),        value: 0,                    color: "#ff9f43" },
              { label: t("dashboard.stats.denied"),   value: stats?.denied ?? 0,   color: "#ff6b6b" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { icon: "📋", label: t("dashboard.statCards.totalApps"),  value: stats?.total ?? 0,   sub: t("dashboard.statCards.monthGrowth"), subColor: "#3dd598", iconClass: "icon-purple" },
            { icon: "✅", label: t("dashboard.statCards.visaGranted"), value: stats?.granted ?? 0, sub: t("dashboard.statCards.approvalRate", { rate: stats?.total ? Math.round((stats.granted / stats.total) * 100) : 0 }), subColor: "#3dd598", iconClass: "icon-green" },
            { icon: "⏳", label: t("dashboard.statCards.underReview"), value: stats?.pending ?? 0, sub: t("dashboard.statCards.avgWait"),     subColor: "#718096", iconClass: "icon-orange" },
            { icon: "🚫", label: t("dashboard.statCards.denied"),      value: stats?.denied ?? 0,  sub: t("dashboard.statCards.vsLastMonth"), subColor: "#ff6b6b", iconClass: "icon-red" },
          ].map(s => (
            <div key={s.label} className="vf-card" style={{ padding: "20px 22px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -10, bottom: -10, width: 70, height: 70, borderRadius: "50%", background: "rgba(108,93,211,0.05)" }} />
              <div className={`${s.iconClass}`} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#1a2035", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: s.subColor, marginTop: 6, fontWeight: 500 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Main Content: Applications Table + Visa Breakdown ── */}
        <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr" : "1fr 280px", gap: 16, alignItems: "start" }}>
          {/* Applications Table Card */}
          {!isAdmin && (<div className="vf-card" style={{ overflow: "hidden" }}>
            {/* Table header with filters */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f4ff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a2035" }}>{t("officer.recentApplications")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {["all","pending","granted","denied"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ height: 30, padding: "0 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid",
                      background: filterStatus === s ? "#6c5dd3" : "#fff",
                      color: filterStatus === s ? "#fff" : "#718096",
                      borderColor: filterStatus === s ? "#6c5dd3" : "#e8edf8" }}>
                    {s === "all" ? t("officer.allFilter") : t(`dashboard.status.${s}`)}
                  </button>
                ))}
                {isAdmin && (
                  <Select value={filterCountry} onValueChange={setFilterCountry}>
                    <SelectTrigger style={{ height: 30, fontSize: 12, width: 120, borderColor: "#e8edf8" }}>
                      <SelectValue placeholder={t("admin.allCountries")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <button style={{ height: 30, padding: "0 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid #e8edf8", background: "#fff", color: "#718096" }}>
                  {t("officer.export")}
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              {appsQuery.isLoading ? (
                <div style={{ padding: 20 }}>
                  {[1,2,3,4].map(i => <div key={i} style={{ height: 48, background: "#f0f4ff", borderRadius: 8, marginBottom: 8 }} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "#a0aec0", fontSize: 14 }}>{t("officer.noApplications")}</div>
              ) : (
                <table className="vf-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>{t("officer.tableId")}</th>
                      <th>{t("officer.tableApplicant")}</th>
                      <th>{t("officer.tableType")}</th>
                      <th>{t("officer.tableRiskScore")}</th>
                      <th>{t("officer.tableStatus")}</th>
                      <th>{t("officer.tableDate")}</th>
                      <th>{t("officer.tableAction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 20).map(app => {
                      const canDecide = app.status !== "granted" && app.status !== "denied";
                      const name = app.applicantName || `User #${app.userId}`;
                      return (
                        <tr key={app.id}>
                          <td>
                            <span style={{ color: "#6c5dd3", fontWeight: 600, fontSize: 13 }}>#{app.id}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <AvatarCircle name={name} size={30} />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: "#1a2035" }}>{name}</div>
                                <div style={{ fontSize: 11, color: "#a0aec0" }}>{app.destinationCountry}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{app.visaType}</td>
                          <td><RiskBar score={app.riskScore} level={app.riskLevel} /></td>
                          <td>{getStatusBadge(app.status, t)}</td>
                          <td style={{ fontSize: 12, color: "#a0aec0" }}>
                            {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              {canDecide && (
                                <>
                                  <button onClick={() => { setSelectedApp(app); setActionType("grant"); }}
                                    data-testid={`button-grant-${app.id}`}
                                    style={{ width: 28, height: 28, borderRadius: 8, background: "#e0faf2", color: "#3dd598", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>✓</button>
                                  <button onClick={() => { setSelectedApp(app); setActionType("deny"); }}
                                    data-testid={`button-deny-${app.id}`}
                                    style={{ width: 28, height: 28, borderRadius: 8, background: "#ffe8e8", color: "#ff6b6b", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>✕</button>
                                </>
                              )}
                              <button onClick={() => setViewDocsApp(app)}
                                data-testid={`button-view-docs-${app.id}`}
                                style={{ width: 28, height: 28, borderRadius: 8, background: "#f0f4ff", color: "#6c5dd3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Eye style={{ width: 13, height: 13 }} />
                              </button>
                              {isAdmin && (
                                <button onClick={() => { if (confirm(`Delete application #${app.id}?`)) deleteAppMutation.mutate(app.id); }}
                                  data-testid={`button-delete-app-${app.id}`}
                                  style={{ width: 28, height: 28, borderRadius: 8, background: "#ffe8e8", color: "#ff6b6b", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Trash2 style={{ width: 12, height: 12 }} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>)}

          {/* Visa Breakdown card */}
          {!isAdmin && (<div className="vf-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035", marginBottom: 16 }}>{t("officer.visaBreakdown")}</div>
            {/* Simple donut */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
              <div style={{ position: "relative", width: 120, height: 120 }}>
                <svg viewBox="0 0 36 36" style={{ width: 120, height: 120, transform: "rotate(-90deg)" }}>
                  {(() => {
                    const total = visaBreakdown.reduce((s, v) => s + v.count, 0) || 1;
                    let offset = 0;
                    return visaBreakdown.map((v, i) => {
                      const pct = (v.count / total) * 100;
                      const el = (
                        <circle key={i} cx="18" cy="18" r="14" fill="none" stroke={v.color}
                          strokeWidth="5" strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset={-offset} />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1a2035" }}>{apps.length}</div>
                  <div style={{ fontSize: 10, color: "#a0aec0" }}>Total</div>
                </div>
              </div>
            </div>
            <div style={{ space: 8 }}>
              {[
                { label: "Student", count: apps.filter(a => a.visaType === "student").length, color: "#6c5dd3" },
                { label: "Business", count: apps.filter(a => a.visaType === "business").length, color: "#3dd598" },
                { label: "Tourist", count: apps.filter(a => a.visaType === "tourist").length, color: "#ff9f43" },
                { label: "Work", count: apps.filter(a => a.visaType === "work").length, color: "#ff6b6b" },
              ].map(v => (
                <div key={v.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: v.color }} />
                    <span style={{ fontSize: 13, color: "#718096" }}>{v.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2035" }}>{v.count}</span>
                </div>
              ))}
            </div>
          </div>)}
        </div>

        {/* ── Admin Tabs ── */}
        {isAdmin && (
          <div style={{ marginTop: 20 }}>
            <Tabs defaultValue="officers">
              <TabsList style={{ background: "#fff", border: "1px solid #e8edf8", borderRadius: 12, padding: 4, gap: 2 }}>
                {[
                  { value: "officers", icon: "🛡️", label: t("admin.officers") },
                  { value: "users", icon: "👤", label: t("admin.applicants") },
                  { value: "feedback", icon: "💬", label: t("admin.feedback") },
                  { value: "system", icon: "📊", label: t("admin.system") },
                ].map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} style={{ borderRadius: 9, fontSize: 13 }} data-testid={tab.value === "feedback" ? "tab-feedback" : undefined}>
                    {tab.icon} {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Officers Tab */}
              <TabsContent value="officers">
                <div className="vf-card" style={{ marginTop: 14, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f4ff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035" }}>{t("officer.immigration")} {t("admin.officers")}</div>
                    <button onClick={() => setCreateOfficerOpen(true)} data-testid="button-create-officer"
                      style={{ height: 34, padding: "0 16px", background: "#6c5dd3", color: "#fff", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <UserPlus style={{ width: 13, height: 13 }} /> {t("officer.newOfficer")}
                    </button>
                  </div>
                  {usersQuery.isLoading ? (
                    <div style={{ padding: 20 }}>{[1,2,3].map(i => <div key={i} style={{ height: 48, background: "#f0f4ff", borderRadius: 8, marginBottom: 8 }} />)}</div>
                  ) : officers.length === 0 ? (
                    <div style={{ padding: 48, textAlign: "center", color: "#a0aec0", fontSize: 14 }}>{t("common.noData")}</div>
                  ) : (
                    <table className="vf-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><th>{t("admin.officers")}</th><th>{t("auth.secureEmail")}</th><th>{t("officer.assignedCountry")}</th><th>LOGIN</th><th>{t("officer.tableAction")}</th></tr></thead>
                      <tbody>
                        {officers.map(u => {
                          const credsVisible = visibleCredentials.has(u.id);
                          const toggleCreds = () => setVisibleCredentials(prev => {
                            const next = new Set(prev);
                            credsVisible ? next.delete(u.id) : next.add(u.id);
                            return next;
                          });
                          return (
                            <>
                              <tr key={u.id}>
                                <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><AvatarCircle name={u.fullName} size={30} /><span style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName}</span></div></td>
                                <td style={{ fontSize: 12, color: "#718096", fontFamily: "monospace" }}>{u.email}</td>
                                <td>
                                  <Select value={u.assignedCountry || ""} onValueChange={country => assignCountryMutation.mutate({ id: u.id, country })}>
                                    <SelectTrigger style={{ height: 28, fontSize: 12, width: 110 }} data-testid={`select-country-${u.id}`}><SelectValue placeholder="Assign" /></SelectTrigger>
                                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                  </Select>
                                </td>
                                <td>
                                  <button onClick={toggleCreds} data-testid={`button-creds-${u.id}`}
                                    style={{ height: 28, padding: "0 10px", borderRadius: 8, border: "1px solid #e8edf8", background: "#f8f9ff", color: "#718096", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                    {credsVisible ? <EyeOff style={{ width: 12, height: 12 }} /> : <Eye style={{ width: 12, height: 12 }} />}
                                    {credsVisible ? t("common.close") : t("common.view")}
                                  </button>
                                </td>
                                <td>
                                  <button onClick={() => { if (confirm(`Delete officer "${u.fullName}"?`)) deleteOfficerMutation.mutate(u.id); }}
                                    data-testid={`button-delete-officer-${u.id}`}
                                    style={{ width: 28, height: 28, borderRadius: 8, background: "#ffe8e8", color: "#ff6b6b", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Trash2 style={{ width: 12, height: 12 }} />
                                  </button>
                                </td>
                              </tr>
                              {credsVisible && (
                                <tr key={`${u.id}-creds`}>
                                  <td colSpan={5}>
                                    <div style={{ background: "#f8f9ff", border: "1px solid #e8edf8", borderRadius: 10, padding: "12px 16px", margin: "0 8px 8px", fontSize: 12 }}>
                                      <div style={{ fontWeight: 700, color: "#a0aec0", fontSize: 10, letterSpacing: "0.08em", marginBottom: 8 }}>LOGIN CREDENTIALS</div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                        <span style={{ color: "#a0aec0", width: 60 }}>Email</span>
                                        <span style={{ fontFamily: "monospace", color: "#1a2035" }} data-testid={`text-email-${u.id}`}>{u.email}</span>
                                        <button onClick={() => { navigator.clipboard.writeText(u.email); toast({ title: "Copied" }); }} data-testid={`button-copy-email-${u.id}`}
                                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6c5dd3" }}><Copy style={{ width: 12, height: 12 }} /></button>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ color: "#a0aec0", width: 60 }}>Password</span>
                                        <span style={{ fontFamily: "monospace", color: "#1a2035" }} data-testid={`text-password-${u.id}`}>{u.plainPassword ?? "not available"}</span>
                                        {u.plainPassword && (
                                          <button onClick={() => { navigator.clipboard.writeText(u.plainPassword!); toast({ title: "Copied" }); }} data-testid={`button-copy-password-${u.id}`}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "#6c5dd3" }}><Copy style={{ width: 12, height: 12 }} /></button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>

              {/* Applicants Tab */}
              <TabsContent value="users">
                <div className="vf-card" style={{ marginTop: 14, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f4ff", fontWeight: 700, fontSize: 15, color: "#1a2035" }}>{t("admin.applicants")}</div>
                  {applicants.length === 0 ? (
                    <div style={{ padding: 48, textAlign: "center", color: "#a0aec0", fontSize: 14 }}>{t("common.noData")}</div>
                  ) : (
                    <table className="vf-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><th>{t("admin.applicants")}</th><th>{t("auth.secureEmail")}</th><th>{t("officer.tableStatus")}</th><th>{t("officer.tableDate")}</th></tr></thead>
                      <tbody>
                        {applicants.map(u => (
                          <tr key={u.id}>
                            <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><AvatarCircle name={u.fullName} size={30} /><span style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName}</span></div></td>
                            <td style={{ fontSize: 12, color: "#718096" }}>{u.email}</td>
                            <td><span className={u.emailVerified ? "badge-granted" : "badge-pending"}>{u.emailVerified ? "Verified" : "verified"}</span></td>
                            <td style={{ fontSize: 12, color: "#a0aec0" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>

              {/* Feedback Tab */}
              <TabsContent value="feedback">
                <div className="vf-card" style={{ marginTop: 14, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f4ff", fontWeight: 700, fontSize: 15, color: "#1a2035" }}>{t("admin.feedback")}</div>
                  {feedbackQuery.isLoading ? (
                    <div style={{ padding: 20 }}>{[1,2,3].map(i => <div key={i} style={{ height: 48, background: "#f0f4ff", borderRadius: 8, marginBottom: 8 }} />)}</div>
                  ) : !feedbackQuery.data?.length ? (
                    <div style={{ padding: 48, textAlign: "center", color: "#a0aec0", fontSize: 14 }}>{t("common.noData")}</div>
                  ) : (
                    <table className="vf-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><th>{t("auth.fullName")}</th><th>{t("auth.secureEmail")}</th><th>{t("admin.feedback")}</th><th>{t("officer.tableDate")}</th></tr></thead>
                      <tbody>
                        {feedbackQuery.data.map(fb => (
                          <tr key={fb.id} data-testid={`row-feedback-${fb.id}`}>
                            <td style={{ fontWeight: 600, fontSize: 13 }}>{fb.userName}</td>
                            <td style={{ fontSize: 12, color: "#718096", fontFamily: "monospace" }}>{fb.userEmail}</td>
                            <td style={{ fontSize: 13, maxWidth: 300 }}><p style={{ margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{fb.message}</p></td>
                            <td style={{ fontSize: 12, color: "#a0aec0" }}>{new Date(fb.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
                  <div className="vf-card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <Database style={{ width: 16, height: 16, color: "#6c5dd3" }} /> Database Status
                    </div>
                    {[
                      { label: "Total Applications", value: stats?.total ?? 0 },
                      { label: "Applicants Registered", value: applicants.length },
                      { label: "Active Officers", value: officers.length },
                      { label: "Blockchain Entries", value: stats?.blockchainEntries ?? 0 },
                    ].map(row => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "#f8f9ff", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#718096" }}>{row.label}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2035" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="vf-card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle style={{ width: 16, height: 16, color: "#ff9f43" }} /> By Country
                    </div>
                    {COUNTRIES.map(country => {
                      const count = apps.filter(a => a.destinationCountry === country).length;
                      const pct = apps.length ? Math.round((count / apps.length) * 100) : 0;
                      return (
                        <div key={country} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: "#718096" }}>{country}</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1a2035" }}>{count}</span>
                          </div>
                          <div style={{ height: 6, background: "#e8edf8", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "#6c5dd3", borderRadius: 99 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      {/* ── Document Review Dialog ── */}
      <Dialog open={!!viewDocsApp} onOpenChange={() => setViewDocsApp(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: "#6c5dd3" }} /> Document Review
            </DialogTitle>
            {viewDocsApp && <p style={{ fontSize: 13, color: "#718096" }}>Application #{viewDocsApp.id} · {viewDocsApp.visaType} Visa · {viewDocsApp.destinationCountry}</p>}
          </DialogHeader>
          {docsQuery.isLoading ? (
            <div className="space-y-3 py-2">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
          ) : !docsQuery.data || docsQuery.data.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "#a0aec0" }}>No documents uploaded.</div>
          ) : (
            <div className="space-y-4 py-2">
              {docsQuery.data.map(doc => {
                const isImage = doc.mimeType?.startsWith("image/");
                const labelMap: Record<string, string> = {
                  passport_photo: "Passport-Size Photo", passport: "Passport / ID",
                  financial: "Bank Statement", invitation: "Invitation Letter",
                  itinerary: "Travel Itinerary", insurance: "Travel Insurance",
                };
                const label = labelMap[doc.documentType] || doc.documentType.replace(/_/g, " ");
                return (
                  <div key={doc.id} style={{ border: "1px solid #e8edf8", borderRadius: 12, overflow: "hidden" }} data-testid={`doc-card-${doc.id}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #f0f4ff", background: "#f8f9ff" }}>
                      <span style={{ fontSize: 16 }}>{isImage ? "🖼️" : "📄"}</span>
                      <span style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{label}</span>
                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                        {doc.verified ? (
                          <span className="badge-granted"><ShieldCheck style={{ width: 12, height: 12 }} /> Verified {doc.aiConfidenceScore ? `${Math.round(doc.aiConfidenceScore * 100)}%` : ""}</span>
                        ) : (
                          <span className="badge-pending"><ShieldAlert style={{ width: 12, height: 12 }} /> Unverified</span>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      {isImage && doc.fileUrl && (
                        <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 12, maxHeight: 300, display: "flex", justifyContent: "center", background: "#f8f9ff" }}>
                          <img src={doc.fileUrl} alt={label} style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }} data-testid={`img-preview-${doc.id}`} />
                        </div>
                      )}
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-open-doc-${doc.id}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6c5dd3", textDecoration: "underline", marginBottom: 10 }}>
                          <Eye style={{ width: 13, height: 13 }} /> {isImage ? "Open full image" : "Open document"}
                        </a>
                      )}
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#a0aec0", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 500, color: "#718096" }}>{doc.fileName}</span>
                        {doc.fileSize ? <span>{(doc.fileSize / 1024).toFixed(1)} KB</span> : null}
                        <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      {doc.aiVerificationNotes && (
                        <div style={{ marginTop: 10, background: "#ede9ff", border: "1px solid #c8bfff", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#6c5dd3" }}>
                          <strong>AI Notes: </strong>{doc.aiVerificationNotes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter className="flex items-center gap-2">
            {docsQuery.data && docsQuery.data.some(d => !d.verified) && (
              <Button
                onClick={handleVerifyAll}
                disabled={verifyingAll}
                data-testid="button-verify-all-docs"
                style={{ background: "#6c5dd3", color: "#fff", border: "none", fontWeight: 600 }}
              >
                <ShieldCheck style={{ width: 15, height: 15, marginRight: 6 }} />
                {verifyingAll ? "Verifying…" : "AI Verify All"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewDocsApp(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Decision Dialog ── */}
      <Dialog open={!!selectedApp && !!actionType} onOpenChange={() => { setSelectedApp(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, color: actionType === "grant" ? "#3dd598" : "#ff6b6b" }}>
              {actionType === "grant" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {actionType === "grant" ? "Grant Visa" : "Deny Application"}
            </DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div style={{ background: "#f8f9ff", border: "1px solid #e8edf8", borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
                <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{selectedApp.visaType} Visa</div>
                <div style={{ color: "#718096", marginTop: 2 }}>Application #{selectedApp.id} · {selectedApp.destinationCountry}</div>
              </div>
              {actionType === "deny" && (
                <div>
                  <Label>Reason for Denial <span style={{ color: "#ff6b6b" }}>*</span></Label>
                  <Textarea className="mt-1.5" placeholder="Provide clear reasons…" value={denialReason} onChange={e => setDenialReason(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Officer Notes (internal)</Label>
                <Textarea className="mt-1.5" placeholder="Internal notes…" value={actionNote} onChange={e => setActionNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedApp(null); setActionType(null); }}>Cancel</Button>
            <Button
              style={{ background: actionType === "grant" ? "#3dd598" : "#ff6b6b", color: "#fff", border: "none" }}
              onClick={() => {
                if (!selectedApp || !actionType) return;
                if (actionType === "deny" && !denialReason.trim()) {
                  toast({ title: "Reason Required", variant: "destructive" }); return;
                }
                decisionMutation.mutate({ id: selectedApp.id, action: actionType, notes: actionNote, reason: denialReason });
              }}
              disabled={decisionMutation.isPending}
            >
              {decisionMutation.isPending ? "Processing…" : actionType === "grant" ? "Confirm Grant" : "Confirm Denial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Create Officer Dialog ── */}
      <Dialog open={createOfficerOpen} onOpenChange={setCreateOfficerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserPlus style={{ width: 18, height: 18, color: "#6c5dd3" }} /> Create New Immigration Officer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: "Full Name", key: "fullName", placeholder: "e.g. Akash", type: "text", testId: "input-officer-name" },
              { label: "Email Address", key: "email", placeholder: "e.g. japan_officer@visa.com", type: "email", testId: "input-officer-email" },
              { label: "Password", key: "password", placeholder: "Min. 6 characters", type: "password", testId: "input-officer-password" },
              { label: "Assigned Country", key: "country", placeholder: "e.g. Japan, Germany…", type: "text", testId: "input-officer-country" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input type={f.type} placeholder={f.placeholder} className="bg-white" data-testid={f.testId}
                  value={(newOfficer as any)[f.key]}
                  onChange={e => setNewOfficer(o => ({ ...o, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOfficerOpen(false); setNewOfficer({ fullName: "", email: "", password: "", country: "" }); }}>Cancel</Button>
            <Button style={{ background: "#6c5dd3", color: "#fff", border: "none" }}
              onClick={() => {
                if (!newOfficer.fullName || !newOfficer.email || !newOfficer.password || !newOfficer.country) {
                  toast({ title: "All fields required", variant: "destructive" }); return;
                }
                if (newOfficer.password.length < 6) { toast({ title: "Password too short", variant: "destructive" }); return; }
                createOfficerMutation.mutate(newOfficer);
              }}
              disabled={createOfficerMutation.isPending} data-testid="button-confirm-create-officer">
              <UserPlus style={{ width: 14, height: 14, marginRight: 6 }} />
              {createOfficerMutation.isPending ? "Creating…" : "Create Officer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
