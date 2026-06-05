import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Video, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Plus, Trash2, ClipboardList } from "lucide-react";

interface Interview {
  id: number; applicationId: number; officerId: number; applicantId: number;
  scheduledAt: string; duration: number; status: string; roomName: string;
  initiatedBy: string; requestNote: string | null; interviewResult: string | null;
  officerNotes: string | null; officerName: string; applicantName: string;
  visaType: string; destinationCountry: string;
}

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const totalMins = 8 * 60 + i * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const label = `${h > 12 ? h - 12 : h}:${m === 0 ? "00" : m} ${h >= 12 ? "PM" : "AM"}`;
  const value = `${String(h).padStart(2,"0")}:${m === 0 ? "00" : m}`;
  return { label, value };
});

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function AvatarCircle({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ["#6c5dd3","#3dd598","#ff9f43","#4d9de0","#ff6b6b","#ffd166","#9b59b6"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function StatusBadge({ status, result }: { status: string; result?: string | null }) {
  if (result === "passed") return <span style={{ background: "#e0faf2", color: "#00a86b", padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, display:"inline-flex",alignItems:"center",gap:4 }}><CheckCircle2 style={{width:10,height:10}}/>Passed</span>;
  if (result === "failed") return <span style={{ background: "#ffe8e8", color: "#ff6b6b", padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, display:"inline-flex",alignItems:"center",gap:4 }}><XCircle style={{width:10,height:10}}/>Failed</span>;
  if (status === "completed") return <span style={{ background: "#e0f0ff", color: "#4d9de0", padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Completed</span>;
  if (status === "in_progress") return <span style={{ background: "#fff3e0", color: "#ff9f43", padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, display:"inline-flex",alignItems:"center",gap:4 }}><span style={{width:6,height:6,borderRadius:"50%",background:"#ff9f43",display:"inline-block",animation:"pulse 1s infinite"}}/>Live</span>;
  if (status === "cancelled") return <span style={{ background: "#f5f5f5", color: "#a0aec0", padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Cancelled</span>;
  return <span style={{ background: "#ede9ff", color: "#6c5dd3", padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Scheduled</span>;
}

function VisaTypePill({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    tourist: { bg: "#e0f0ff", color: "#4d9de0" },
    student: { bg: "#ede9ff", color: "#6c5dd3" },
    work: { bg: "#fff3e0", color: "#ff9f43" },
    business: { bg: "#e0faf2", color: "#00a86b" },
    transit: { bg: "#fff9e0", color: "#d4a000" },
  };
  const style = map[type?.toLowerCase()] || { bg: "#f0f4ff", color: "#718096" };
  return <span style={{ ...style, padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{type}</span>;
}

export default function OfficerInterviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const isOfficer = user?.role === "officer" || user?.role === "admin";
  const now = new Date();
  const notifRef = useRef<HTMLDivElement>(null);

  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedAppId, setSelectedAppId] = useState("");
  const [resultDialog, setResultDialog] = useState<Interview | null>(null);
  const [resultValue, setResultValue] = useState<"passed"|"failed">("passed");
  const [resultNotes, setResultNotes] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule"|"upcoming"|"all">("schedule");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: ["interviews"],
    queryFn: async () => {
      const token = localStorage.getItem("visa_token");
      const res = await fetch("/api/interviews", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: apps = [] } = useQuery<any[]>({
    queryKey: [isOfficer ? "/api/applications/all" : "/api/applications"],
    queryFn: async () => {
      const token = localStorage.getItem("visa_token");
      const url = isOfficer ? "/api/applications/all" : "/api/applications";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: scheduledInterviews = [] } = useQuery<any[]>({
    queryKey: ["officer-interviews-notif"],
    queryFn: async () => {
      const token = localStorage.getItem("visa_token");
      const res = await fetch("/api/interviews", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((i: any) => i.status === "scheduled");
    },
    refetchInterval: 30000,
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAppId || !selectedSlot) throw new Error("Select both application and time");
      const token = localStorage.getItem("visa_token");
      const dt = new Date(viewYear, viewMonth, selectedDay);
      const [h, m] = selectedSlot.split(":").map(Number);
      dt.setHours(h, m || 0, 0, 0);
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ applicationId: Number(selectedAppId), scheduledAt: dt.toISOString(), duration: 30 }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed to schedule"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Interview Scheduled!" });
      qc.invalidateQueries({ queryKey: ["interviews"] });
      qc.invalidateQueries({ queryKey: ["officer-interviews-notif"] });
      setScheduleOpen(false); setSelectedSlot(""); setSelectedAppId("");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("visa_token");
      await fetch(`/api/interviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => { toast({ title: "Interview Cancelled" }); qc.invalidateQueries({ queryKey: ["interviews"] }); },
  });

  const resultMutation = useMutation({
    mutationFn: async () => {
      if (!resultDialog) return;
      const token = localStorage.getItem("visa_token");
      const res = await fetch(`/api/interviews/${resultDialog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "completed", interviewResult: resultValue, officerNotes: resultNotes }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Result submitted" });
      qc.invalidateQueries({ queryKey: ["interviews"] });
      setResultDialog(null); setResultNotes("");
    },
  });

  // Calendar helpers
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const selectedDateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;
  const dayInterviews = interviews.filter(iv => iv.scheduledAt.startsWith(selectedDateStr) && iv.status !== "cancelled");
  const todayStr = now.toISOString().slice(0,10);
  const todayInterviews = interviews.filter(iv => iv.scheduledAt.startsWith(todayStr) && iv.status !== "cancelled");
  const upcomingInterviews = interviews.filter(iv => new Date(iv.scheduledAt) > now && iv.status === "scheduled");
  const completedCount = interviews.filter(iv => iv.status === "completed").length;
  const scheduledCount = interviews.filter(iv => iv.status === "scheduled").length;

  const bookedSlots = new Set(dayInterviews.map(iv => {
    const d = new Date(iv.scheduledAt);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }));

  const isToday = (day: number) => day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  const isPast = (day: number) => new Date(viewYear, viewMonth, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hasInterviews = (day: number) => {
    const ds = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return interviews.filter(iv => iv.scheduledAt.startsWith(ds) && iv.status !== "cancelled").length;
  };

  const allTabInterviews = activeTab === "schedule" ? dayInterviews
    : activeTab === "upcoming" ? upcomingInterviews
    : interviews.filter(iv => iv.status !== "cancelled");

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div className="vf-header">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a2035" }}>
          Interview <span style={{ color: "#6c5dd3" }}>Scheduler</span>
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isOfficer && (
            <button onClick={() => setScheduleOpen(true)}
              style={{ height: 36, padding: "0 16px", background: "#6c5dd3", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus style={{ width: 14, height: 14 }} /> Schedule Interview
            </button>
          )}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button onClick={() => setNotifOpen(o => !o)}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              🔔
              {scheduledInterviews.length > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#ff6b6b", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                  {scheduledInterviews.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 300, background: "#fff", border: "1px solid #e8edf8", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 1000, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f4ff", fontWeight: 700, fontSize: 14, color: "#1a2035" }}>🎥 Upcoming Calls</div>
                {scheduledInterviews.length === 0 ? (
                  <div style={{ padding: 20, color: "#a0aec0", fontSize: 13, textAlign: "center" }}>No pending interviews</div>
                ) : scheduledInterviews.slice(0, 4).map((iv: any) => (
                  <div key={iv.id} style={{ padding: "10px 16px", borderBottom: "1px solid #f0f4ff", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ede9ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎥</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: "#1a2035", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{iv.applicantName || `Applicant #${iv.applicantId}`}</div>
                      <div style={{ fontSize: 11, color: "#a0aec0" }}>{new Date(iv.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {new Date(iv.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                    </div>
                    <span style={{ background: "#ede9ff", color: "#6c5dd3", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>Soon</span>
                  </div>
                ))}
                {scheduledInterviews.length > 4 && (
                  <div style={{ padding: "8px 16px", fontSize: 12, color: "#6c5dd3", fontWeight: 600, textAlign: "center" }}>+{scheduledInterviews.length - 4} more</div>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* ── Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { icon: <CalendarDays style={{width:20,height:20,color:"#6c5dd3"}}/>, label: "TOTAL INTERVIEWS", value: interviews.length, bg: "#ede9ff" },
            { icon: <Clock style={{width:20,height:20,color:"#ff9f43"}}/>, label: "SCHEDULED", value: scheduledCount, bg: "#fff3e0" },
            { icon: <CheckCircle2 style={{width:20,height:20,color:"#3dd598"}}/>, label: "COMPLETED", value: completedCount, bg: "#e0faf2" },
            { icon: <Video style={{width:20,height:20,color:"#4d9de0"}}/>, label: "TODAY'S SESSIONS", value: todayInterviews.length, bg: "#e0f0ff" },
          ].map(s => (
            <div key={s.label} className="vf-card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0" }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#1a2035", lineHeight: 1.1 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Layout: Calendar left + Panel right ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "start" }}>

          {/* LEFT: Calendar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="vf-card" style={{ padding: "22px 24px" }}>
              {/* Month nav */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1a2035" }}>
                  📅 {MONTH_NAMES[viewMonth]} <span style={{ color: "#6c5dd3" }}>{viewYear}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); }}
                    style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronLeft style={{ width: 14, height: 14, color: "#718096" }} />
                  </button>
                  <button onClick={() => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); setSelectedDay(now.getDate()); }}
                    style={{ height: 32, padding: "0 12px", borderRadius: 9, border: "1px solid #e8edf8", background: "#f8f9ff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#718096" }}>
                    Today
                  </button>
                  <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); }}
                    style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronRight style={{ width: 14, height: 14, color: "#718096" }} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 8 }}>
                {DAY_NAMES.map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#a0aec0", letterSpacing: "0.07em", padding: "4px 0" }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const isSelected = day === selectedDay && viewMonth === viewMonth;
                  const today = isToday(day);
                  const past = isPast(day);
                  const count = hasInterviews(day);
                  return (
                    <div key={day} onClick={() => !past && setSelectedDay(day)}
                      style={{
                        borderRadius: 10, padding: "10px 6px 8px", cursor: past ? "default" : "pointer",
                        background: isSelected ? "#6c5dd3" : today ? "#ede9ff" : "#fff",
                        border: `1px solid ${isSelected ? "#6c5dd3" : today ? "#c4b5fd" : "#e8edf8"}`,
                        opacity: past ? 0.35 : 1,
                        transition: "all 0.12s",
                        textAlign: "center",
                        position: "relative",
                      }}
                      onMouseEnter={e => { if (!past && !isSelected) (e.currentTarget as HTMLElement).style.background = "#f0f4ff"; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = today ? "#ede9ff" : "#fff"; }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: isSelected ? "#fff" : today ? "#6c5dd3" : "#1a2035" }}>{day}</div>
                      {count > 0 && (
                        <div style={{ marginTop: 4, display: "flex", justifyContent: "center", gap: 2 }}>
                          {Array.from({ length: Math.min(count, 3) }).map((_, ci) => (
                            <div key={ci} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.8)" : "#6c5dd3" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Grid for selected day */}
            <div className="vf-card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035" }}>
                  🕐 {MONTH_NAMES[viewMonth]} {selectedDay} — Available Slots
                </div>
                <span style={{ background: "#e0faf2", color: "#00a86b", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
                  {TIME_SLOTS.length - bookedSlots.size} free
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                {TIME_SLOTS.map(slot => {
                  const booked = bookedSlots.has(slot.value);
                  const iv = dayInterviews.find(iv => {
                    const d = new Date(iv.scheduledAt);
                    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` === slot.value;
                  });
                  return (
                    <div key={slot.value}
                      onClick={() => { if (!booked && isOfficer) { setSelectedSlot(slot.value); setScheduleOpen(true); } }}
                      style={{
                        border: `1.5px solid ${booked ? "#e8edf8" : "#c8f0dd"}`,
                        borderRadius: 10, padding: "10px 6px", textAlign: "center",
                        background: booked ? "#f8f9ff" : "#f0faf5",
                        cursor: booked ? "default" : "pointer",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { if (!booked) (e.currentTarget as HTMLElement).style.background = "#dcf8ed"; }}
                      onMouseLeave={e => { if (!booked) (e.currentTarget as HTMLElement).style.background = "#f0faf5"; }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: booked ? "#a0aec0" : "#1a2035" }}>{slot.label}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: booked ? "#a0aec0" : "#3dd598", letterSpacing: "0.05em" }}>
                        {booked ? "BOOKED" : "FREE"}
                      </div>
                      {booked && iv && (
                        <div style={{ fontSize: 10, color: "#6c5dd3", marginTop: 3, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {iv.applicantName?.split(" ")[0]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Interview list panel */}
          <div className="vf-card" style={{ overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{ padding: "0 20px", borderBottom: "1px solid #f0f4ff", display: "flex", gap: 0 }}>
              {[
                { key: "schedule", label: `📋 ${MONTH_NAMES[viewMonth].slice(0,3)} ${selectedDay}`, count: dayInterviews.length },
                { key: "upcoming", label: "⏳ Upcoming", count: upcomingInterviews.length },
                { key: "all", label: "📁 All", count: interviews.filter(iv => iv.status !== "cancelled").length },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    height: 44, padding: "0 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    color: activeTab === tab.key ? "#6c5dd3" : "#a0aec0",
                    borderBottom: activeTab === tab.key ? "2px solid #6c5dd3" : "2px solid transparent",
                    display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                  }}>
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{ background: activeTab === tab.key ? "#ede9ff" : "#f0f4ff", color: activeTab === tab.key ? "#6c5dd3" : "#a0aec0", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Interview cards */}
            <div style={{ maxHeight: 560, overflowY: "auto" }}>
              {isLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎥</div>Loading interviews...
                </div>
              ) : allTabInterviews.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "#a0aec0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 26 }}>📅</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {activeTab === "schedule" ? "No interviews today" : activeTab === "upcoming" ? "No upcoming interviews" : "No interviews yet"}
                  </div>
                  {isOfficer && <div style={{ fontSize: 12 }}>Click <strong>+ Schedule Interview</strong> to add one</div>}
                </div>
              ) : (
                allTabInterviews.map((iv, idx) => {
                  const d = new Date(iv.scheduledAt);
                  const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const isNow = Math.abs(Date.now() - d.getTime()) < 35 * 60000;
                  const isLive = iv.status === "in_progress";

                  return (
                    <div key={iv.id} style={{
                      padding: "16px 18px",
                      borderBottom: idx < allTabInterviews.length - 1 ? "1px solid #f0f4ff" : "none",
                      background: isLive ? "#fffbeb" : "#fff",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => { if (!isLive) (e.currentTarget as HTMLElement).style.background = "#fafbff"; }}
                      onMouseLeave={e => { if (!isLive) (e.currentTarget as HTMLElement).style.background = "#fff"; }}>

                      {/* Top row: avatar + name + time */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                        <AvatarCircle name={iv.applicantName || "?"} size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035", marginBottom: 2 }}>{iv.applicantName || "—"}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <VisaTypePill type={iv.visaType} />
                            {iv.destinationCountry && (
                              <span style={{ fontSize: 11, color: "#718096" }}>→ {iv.destinationCountry}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#6c5dd3" }}>{timeStr}</div>
                          {activeTab !== "schedule" && <div style={{ fontSize: 11, color: "#a0aec0" }}>{dateStr}</div>}
                        </div>
                      </div>

                      {/* Middle row: status + duration */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <StatusBadge status={iv.status} result={iv.interviewResult} />
                        <span style={{ fontSize: 11, color: "#a0aec0" }}>· {iv.duration || 30} min</span>
                        {iv.officerNotes && (
                          <span style={{ fontSize: 11, color: "#a0aec0", flex: 1, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            📝 {iv.officerNotes}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 8 }}>
                        {iv.roomName && (isNow || isLive) && (
                          <button onClick={() => window.open(`https://meet.jit.si/${iv.roomName}`, "_blank")}
                            style={{ flex: 1, height: 32, background: "#6c5dd3", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <Video style={{ width: 13, height: 13 }} /> Join Call
                          </button>
                        )}
                        {isOfficer && iv.status !== "completed" && iv.status !== "cancelled" && (
                          <button onClick={() => setResultDialog(iv)}
                            style={{ flex: 1, height: 32, background: "#ede9ff", color: "#6c5dd3", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                            <ClipboardList style={{ width: 12, height: 12 }} /> Submit Result
                          </button>
                        )}
                        {iv.status === "scheduled" && (
                          <button onClick={() => { if (confirm("Cancel this interview?")) cancelMutation.mutate(iv.id); }}
                            style={{ width: 32, height: 32, background: "#fff3f3", color: "#ff6b6b", border: "1px solid #ffd0d0", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Schedule Dialog ── */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📅 Schedule Interview</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#f0f4ff", border: "1px solid #e8edf8", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a0aec0", letterSpacing: "0.07em", marginBottom: 4 }}>SELECTED DATE & TIME</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#6c5dd3" }}>
                {MONTH_NAMES[viewMonth]} {selectedDay}, {viewYear}
                {selectedSlot && ` at ${TIME_SLOTS.find(s => s.value === selectedSlot)?.label}`}
              </div>
            </div>
            <div>
              <Label style={{ marginBottom: 6, display: "block" }}>Select Application</Label>
              <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                <SelectTrigger><SelectValue placeholder="Choose an application..." /></SelectTrigger>
                <SelectContent>
                  {apps.filter(a => !["granted","denied"].includes(a.status)).map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      #{a.id} — {a.visaType || "Visa"} → {a.destinationCountry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ marginBottom: 6, display: "block" }}>Time Slot</Label>
              <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                <SelectTrigger><SelectValue placeholder="Choose a time..." /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.filter(s => !bookedSlots.has(s.value)).map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter style={{ gap: 8, marginTop: 8 }}>
            <button onClick={() => setScheduleOpen(false)}
              style={{ height: 38, padding: "0 18px", border: "1px solid #e8edf8", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, color: "#718096" }}>
              Cancel
            </button>
            <button onClick={() => scheduleMutation.mutate()} disabled={!selectedAppId || !selectedSlot || scheduleMutation.isPending}
              style={{ height: 38, padding: "0 22px", border: "none", borderRadius: 10, background: !selectedAppId || !selectedSlot ? "#c4b5fd" : "#6c5dd3", color: "#fff", cursor: !selectedAppId || !selectedSlot ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}>
              {scheduleMutation.isPending ? "Scheduling…" : "Confirm Booking"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Result Dialog ── */}
      <Dialog open={!!resultDialog} onOpenChange={() => { setResultDialog(null); setResultNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📝 Submit Interview Result</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#f0f4ff", border: "1px solid #e8edf8", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <AvatarCircle name={resultDialog?.applicantName || "?"} size={38} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035" }}>{resultDialog?.applicantName}</div>
                <div style={{ fontSize: 12, color: "#718096" }}>{resultDialog?.visaType} Visa · {resultDialog?.destinationCountry}</div>
              </div>
            </div>
            <div>
              <Label style={{ marginBottom: 8, display: "block" }}>Interview Outcome</Label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["passed","failed"] as const).map(v => (
                  <button key={v} onClick={() => setResultValue(v)}
                    style={{
                      flex: 1, height: 44, borderRadius: 10, border: `2px solid ${resultValue === v ? (v === "passed" ? "#3dd598" : "#ff6b6b") : "#e8edf8"}`,
                      background: resultValue === v ? (v === "passed" ? "#e0faf2" : "#ffe8e8") : "#fff",
                      color: resultValue === v ? (v === "passed" ? "#00a86b" : "#ff6b6b") : "#718096",
                      fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                    }}>
                    {v === "passed" ? "✅ Passed" : "❌ Failed"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label style={{ marginBottom: 6, display: "block" }}>Officer Notes (optional)</Label>
              <textarea value={resultNotes} onChange={e => setResultNotes(e.target.value)}
                placeholder="Add any notes about this interview…"
                style={{ width: "100%", minHeight: 80, borderRadius: 10, border: "1px solid #e8edf8", padding: "10px 12px", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", background: "#f8f9ff" }} />
            </div>
          </div>
          <DialogFooter style={{ gap: 8, marginTop: 8 }}>
            <button onClick={() => { setResultDialog(null); setResultNotes(""); }}
              style={{ height: 38, padding: "0 18px", border: "1px solid #e8edf8", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, color: "#718096" }}>
              Cancel
            </button>
            <button onClick={() => resultMutation.mutate()} disabled={resultMutation.isPending}
              style={{ height: 38, padding: "0 22px", border: "none", borderRadius: 10, background: "#6c5dd3", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              {resultMutation.isPending ? "Saving…" : "Submit Result"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
