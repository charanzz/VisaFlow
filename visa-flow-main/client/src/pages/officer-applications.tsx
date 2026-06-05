import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Eye, Check, X, ChevronRight } from "lucide-react";

interface Application {
  id: number; userId: number; applicationType: string; visaType: string;
  purposeOfVisit: string; destinationCountry: string;
  intendedEntryDate: string | null; intendedExitDate: string | null;
  status: string; currentStage: number; riskScore: number | null;
  riskLevel: string | null; aiAnalysisSummary: string | null;
  officerNotes: string | null; createdAt: string;
  applicantName?: string; applicantNationality?: string;
}

const NATIONALITIES: Record<string, string> = {
  1: "Indian", 2: "Chinese", 3: "Brazilian", 4: "Russian", 5: "Japanese",
};

function AvatarCircle({ name, size = 34 }: { name: string; size?: number }) {
  const colors = ["#6c5dd3", "#3dd598", "#ff9f43", "#4d9de0", "#ff6b6b", "#ffd166", "#9b59b6"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    granted:         { label: "Granted",      bg: "#e0faf2", color: "#00a86b" },
    pending:         { label: "Pending",       bg: "#fff9e0", color: "#d4a000" },
    denied:          { label: "Denied",        bg: "#ffe8e8", color: "#e53535" },
    document_review: { label: "Under Review",  bg: "#ede9ff", color: "#6c5dd3" },
    security_check:  { label: "Under Review",  bg: "#ede9ff", color: "#6c5dd3" },
    risk_assessment: { label: "Under Review",  bg: "#ede9ff", color: "#6c5dd3" },
    blockchain_entry:{ label: "Under Review",  bg: "#ede9ff", color: "#6c5dd3" },
  };
  const cfg = map[status] || { label: status, bg: "#f0f4ff", color: "#6c5dd3" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "4px 12px", borderRadius: 20,
      fontSize: 12, fontWeight: 600 }}>{cfg.label}</span>
  );
}

function RiskBar({ score, level }: { score: number | null; level: string | null }) {
  if (score === null) return <span style={{ color: "#a0aec0" }}>—</span>;
  const color = level === "high" ? "#ff6b6b" : level === "medium" ? "#ff9f43" : "#3dd598";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 5, background: "#e8edf8", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{score.toFixed(0)}%</span>
    </div>
  );
}

function DocsBar({ stage }: { stage: number }) {
  const filled = Math.min(stage, 9);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 60, height: 5, background: "#e8edf8", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${(filled / 9) * 100}%`, height: "100%", background: "#6c5dd3", borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, color: "#718096" }}>{filled}/9</span>
    </div>
  );
}

function WaitingDays({ createdAt }: { createdAt: string }) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  const color = days > 7 ? "#ff6b6b" : days > 3 ? "#ff9f43" : "#1a2035";
  return <span style={{ fontWeight: 700, color, fontSize: 14 }}>{days}d</span>;
}

export default function OfficerApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionType, setActionType] = useState<"grant" | "deny" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [denialReason, setDenialReason] = useState("");
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

  const { data: apps = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications/all"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/applications/all", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats/overview"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/stats/overview", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { total: 0, pending: 0, granted: 0, denied: 0 };
      return res.json();
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ id, action, notes, reason }: any) => {
      const token = localStorage.getItem("token");
      const path = action === "grant" ? `/api/officer/applications/${id}/grant` : `/api/officer/applications/${id}/deny`;
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ notes, reason }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/applications/all"] });
      qc.invalidateQueries({ queryKey: ["/api/stats/overview"] });
      toast({ title: vars.action === "grant" ? "✅ Visa Granted!" : "❌ Application Denied" });
      setSelectedApp(null); setActionType(null); setActionNote(""); setDenialReason("");
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const statCards = [
    { icon: "📋", label: "TOTAL", value: stats?.total ?? apps.length, highlight: false },
    { icon: "⏳", label: "AWAITING", value: stats?.pending ?? 0, color: "#ff9f43", highlight: false },
    { icon: "🚩", label: "FLAGGED", value: apps.filter(a => a.riskLevel === "high").length, color: "#ff6b6b", highlight: false },
    { icon: "✅", label: "GRANTED", value: stats?.granted ?? 0, color: "#3dd598", highlight: false },
    { icon: "🚫", label: "DENIED", value: stats?.denied ?? 0, color: "#ff6b6b", highlight: false },
  ];

  const tabs = ["All", "Submitted", "Under Review", "Pending", "Flagged", "Granted", "Denied"];
  const tabStatusMap: Record<string, string> = {
    "submitted": "pending", "under review": "document_review",
    "pending": "pending", "flagged": "risk_assessment",
    "granted": "granted", "denied": "denied"
  };

  let filtered = apps.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || String(a.id).includes(q) || a.visaType.includes(q) ||
      a.destinationCountry.toLowerCase().includes(q) || (a.applicantName || "").toLowerCase().includes(q);
    const tabKey = filter.toLowerCase();
    const matchTab = filter === "all" || a.status === tabStatusMap[tabKey] ||
      (filter === "flagged" && a.riskLevel === "high") ||
      (filter === "under review" && ["document_review","security_check","risk_assessment","blockchain_entry"].includes(a.status));
    const matchPriority = priorityFilter === "all" ||
      (priorityFilter === "urgent" && Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86400000) > 7) ||
      (priorityFilter === "high risk" && a.riskLevel === "high") ||
      (priorityFilter === "flagged" && a.riskLevel === "high") ||
      (priorityFilter === "new" && Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86400000) < 2);
    return matchSearch && matchTab && matchPriority;
  });

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      {/* Header */}
      <div className="vf-header">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a2035" }}>
          Visa <span style={{ color: "#6c5dd3" }}>Applications</span>
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              🔔
              {scheduledInterviews.length > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#ff6b6b", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                  {scheduledInterviews.length}
                </span>
              )}
            </button>
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
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 20 }}>
          {statCards.map((s, i) => (
            <div key={s.label} className="vf-card" style={{ padding: "18px 20px", border: i === 0 ? "2px solid #6c5dd3" : "1px solid #e8edf8" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color || "#1a2035" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Priority Queue Banner */}
        <div style={{ background: "linear-gradient(135deg,#1a2035,#2d3561,#3d4a8a)", borderRadius: 16, padding: "16px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              🎯 Priority Queue
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>Filter applications that need immediate attention</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["All", "⚡ Urgent", "🔴 High Risk", "🚩 Flagged", "🆕 New"].map((p, i) => {
              const key = i === 0 ? "all" : p.split(" ")[1]?.toLowerCase() || "all";
              const active = priorityFilter === key;
              return (
                <button key={p} onClick={() => setPriorityFilter(key)}
                  style={{ height: 30, padding: "0 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                    background: active ? "#fff" : "rgba(255,255,255,0.1)", color: active ? "#1a2035" : "rgba(255,255,255,0.7)" }}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Application Queue Table */}
        <div className="vf-card" style={{ overflow: "hidden" }}>
          {/* Filter Tabs + Search */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f4ff", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14, color: "#1a2035" }}>
              📋 Application Queue
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setFilter(t.toLowerCase())}
                  style={{ height: 28, padding: "0 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none",
                    background: filter === t.toLowerCase() ? "#6c5dd3" : "transparent",
                    color: filter === t.toLowerCase() ? "#fff" : "#718096" }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: "auto", position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a0aec0", fontSize: 14 }}>🔍</span>
              <input placeholder="Search name, ID, visa..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, paddingRight: 12, height: 34, border: "1px solid #e8edf8", borderRadius: 10, fontSize: 12, color: "#1a2035", background: "#f8f9ff", outline: "none", width: 200 }} />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8edf8" }}>
                  {["APP ID", "APPLICANT", "VISA TYPE", "WAITING", "RISK", "DOCS", "STATUS", "ACTIONS"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>Loading applications...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "#a0aec0" }}>No applications found</td></tr>
                ) : filtered.map(app => {
                  const name = app.applicantName || `User #${app.userId}`;
                  const nationality = app.applicantNationality || "";
                  const canDecide = !["granted","denied"].includes(app.status);
                  return (
                    <tr key={app.id} style={{ borderBottom: "1px solid #f0f4ff" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8f9ff"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ color: "#6c5dd3", fontWeight: 600, fontSize: 13 }}>APP-{String(app.id).padStart(4,"0")}</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <AvatarCircle name={name} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                            <div style={{ fontSize: 11, color: "#a0aec0" }}>{nationality || app.destinationCountry}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13 }}>{app.visaType.charAt(0).toUpperCase() + app.visaType.slice(1)} Visa</td>
                      <td style={{ padding: "14px 16px" }}><WaitingDays createdAt={app.createdAt} /></td>
                      <td style={{ padding: "14px 16px" }}><RiskBar score={app.riskScore} level={app.riskLevel} /></td>
                      <td style={{ padding: "14px 16px" }}><DocsBar stage={app.currentStage} /></td>
                      <td style={{ padding: "14px 16px" }}><StatusBadge status={app.status} /></td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link href={`/applications/${app.id}`}>
                            <button style={{ width: 28, height: 28, borderRadius: 8, background: "#f0f4ff", color: "#6c5dd3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Eye style={{ width: 13, height: 13 }} />
                            </button>
                          </Link>
                          {canDecide && (
                            <button onClick={() => { setSelectedApp(app); setActionType("grant"); }}
                              style={{ width: 28, height: 28, borderRadius: 8, background: "#e0faf2", color: "#3dd598", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>✓</button>
                          )}
                          <button onClick={() => { setSelectedApp(app); setActionType("deny"); }}
                            style={{ width: 28, height: 28, borderRadius: 8, background: "#ffe8e8", color: "#ff6b6b", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Decision Dialog */}
      <Dialog open={!!selectedApp && !!actionType} onOpenChange={() => { setSelectedApp(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: actionType === "grant" ? "#3dd598" : "#ff6b6b" }}>
              {actionType === "grant" ? "✅ Grant Visa" : "❌ Deny Application"}
            </DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#f8f9ff", border: "1px solid #e8edf8", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontWeight: 600 }}>APP-{String(selectedApp.id).padStart(4,"0")} · {selectedApp.visaType} Visa · {selectedApp.destinationCountry}</div>
              </div>
              {actionType === "deny" && (
                <div>
                  <Label>Reason for Denial *</Label>
                  <Textarea className="mt-1" placeholder="Provide clear reasons..." value={denialReason} onChange={e => setDenialReason(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Officer Notes</Label>
                <Textarea className="mt-1" placeholder="Internal notes..." value={actionNote} onChange={e => setActionNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => { setSelectedApp(null); setActionType(null); }}
              style={{ height: 36, padding: "0 16px", border: "1px solid #e8edf8", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={() => {
                if (!selectedApp || !actionType) return;
                if (actionType === "deny" && !denialReason.trim()) { toast({ title: "Reason required", variant: "destructive" }); return; }
                decisionMutation.mutate({ id: selectedApp.id, action: actionType, notes: actionNote, reason: denialReason });
              }}
              disabled={decisionMutation.isPending}
              style={{ height: 36, padding: "0 20px", border: "none", borderRadius: 10, background: actionType === "grant" ? "#3dd598" : "#ff6b6b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {decisionMutation.isPending ? "Processing..." : actionType === "grant" ? "Confirm Grant" : "Confirm Denial"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
