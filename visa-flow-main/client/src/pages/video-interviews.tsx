import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Video, CheckCircle, XCircle, Lock, Calendar, Clock } from "lucide-react";

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
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const label = `${displayH}:${m === 0 ? "00" : "30"} ${ampm}`;
  const value = `${String(h).padStart(2,"0")}:${m === 0 ? "00" : "30"}`;
  return { label, value };
});

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function StatusBadge({ status, result }: { status: string; result?: string | null }) {
  if (result === "passed") return <span style={{ background: "#e0faf2", color: "#00a86b", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, display:"inline-flex",alignItems:"center",gap:4 }}><CheckCircle style={{width:11,height:11}}/>Passed</span>;
  if (result === "failed") return <span style={{ background: "#ffe8e8", color: "#e53535", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, display:"inline-flex",alignItems:"center",gap:4 }}><XCircle style={{width:11,height:11}}/>Failed</span>;
  const map: Record<string,{bg:string,color:string,label:string}> = {
    scheduled:   { bg:"#ede9ff", color:"#6c5dd3", label:"Scheduled" },
    in_progress: { bg:"#e0faf2", color:"#00a86b", label:"In Progress" },
    completed:   { bg:"#f0f4ff", color:"#4d9de0", label:"Completed" },
    cancelled:   { bg:"#ffe8e8", color:"#ff6b6b", label:"Cancelled" },
    missed:      { bg:"#fff9e0", color:"#d4a000", label:"Missed" },
  };
  const cfg = map[status] || { bg:"#f0f4ff", color:"#718096", label:status };
  return <span style={{ background:cfg.bg, color:cfg.color, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{cfg.label}</span>;
}

function JitsiLinkPanel({ interview }: { interview: Interview }) {
  const scheduledAt = new Date(interview.scheduledAt);
  const windowStart = new Date(scheduledAt.getTime() - 5 * 60000);
  const windowEnd = new Date(scheduledAt.getTime() + 40 * 60000);
  const now = new Date();
  const isActive = now >= windowStart && now <= windowEnd;
  const isPast = now > windowEnd;
  const jitsiUrl = `https://meet.jit.si/${interview.roomName}`;

  const dateStr = scheduledAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeStr = scheduledAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const endStr = windowEnd.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ border: `2px solid ${isActive ? "#3dd598" : "#e8edf8"}`, borderRadius: 14, padding: "16px 18px", background: isActive ? "#f0fdf7" : "#fafbff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Video style={{ width: 16, height: 16, color: isActive ? "#3dd598" : "#6c5dd3" }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: "#1a2035" }}>Jitsi Video Link</span>
        {isActive ? (
          <span style={{ background: "#e0faf2", color: "#00a86b", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>🟢 LIVE NOW</span>
        ) : isPast ? (
          <span style={{ background: "#f0f4ff", color: "#a0aec0", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>EXPIRED</span>
        ) : (
          <span style={{ background: "#fff9e0", color: "#d4a000", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🔒 LOCKED</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: "#718096", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
          <Calendar style={{ width: 11, height: 11 }} /> {dateStr}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Clock style={{ width: 11, height: 11 }} /> Active window: {timeStr} – {endStr}
        </div>
      </div>
      {isActive ? (
        <a href={jitsiUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, background: "#3dd598", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          <Video style={{ width: 14, height: 14 }} /> Join Meeting Now
        </a>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, background: "#f0f4ff", color: "#a0aec0", borderRadius: 10, fontSize: 12, fontWeight: 600, border: "1px solid #e8edf8" }}>
          <Lock style={{ width: 13, height: 13 }} />
          {isPast ? "Session expired" : `Link unlocks at ${timeStr}`}
        </div>
      )}
      {!isActive && !isPast && (
        <p style={{ fontSize: 10, color: "#a0aec0", textAlign: "center", marginTop: 8 }}>
          The join link activates 5 minutes before your scheduled time and expires 40 minutes after.
        </p>
      )}
    </div>
  );
}

export default function VideoInterviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = new Date();

  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [bookOpen, setBookOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [activeTab, setActiveTab] = useState<"calendar"|"list">("calendar");
  const [lastBooked, setLastBooked] = useState<Interview | null>(null);

  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: ["interviews"],
    queryFn: async () => {
      const token = localStorage.getItem("visa_token");
      const res = await fetch("/api/interviews", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 20000,
  });

  const { data: apps = [], isLoading: appsLoading } = useQuery<any[]>({
    queryKey: ["/api/applications"],
    queryFn: async () => {
      const token = localStorage.getItem("visa_token");
      const res = await fetch("/api/applications", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Auto-pick the first active application
  const activeApps = apps.filter((a: any) => !["granted","denied"].includes(a.status));
  const selectedApplication = activeApps[0] ?? null;
  const autoAppId = selectedApplication?.id ? String(selectedApplication.id) : "";
  const canBook = !!selectedApplication && !appsLoading;

  const bookMutation = useMutation({
    mutationFn: async () => {
      const appId = autoAppId;
      if (!canBook || !appId || !selectedSlot) throw new Error("Application data is still loading");
      const token = localStorage.getItem("visa_token");
      const dt = new Date(viewYear, viewMonth, selectedDay);
      const [h, m] = selectedSlot.split(":").map(Number);
      dt.setHours(h, m || 0, 0, 0);
      if (dt < new Date()) throw new Error("Cannot book a slot in the past");
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ applicationId: Number(appId), scheduledAt: dt.toISOString(), duration: 30, requestNote: requestNote || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed to book"); }
      return res.json();
    },
    onSuccess: (newInterview: Interview) => {
      toast({ title: "✅ Interview Booked!", description: "Your interview has been scheduled. The officer has been notified." });
      qc.invalidateQueries({ queryKey: ["interviews"] });
      qc.invalidateQueries({ queryKey: ["/api/applications"] });
      setLastBooked(newInterview);
      setBookOpen(false);
      setSelectedSlot("");
      setRequestNote("");
      setActiveTab("list");
    },
    onError: (e: Error) => toast({ title: "Booking Failed", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to cancel");
    },
    onSuccess: () => { toast({ title: "Interview Cancelled" }); qc.invalidateQueries({ queryKey: ["interviews"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const selectedDateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;

  const getDateInterviews = (dateStr: string) =>
    interviews.filter(iv => iv.scheduledAt.slice(0,10) === dateStr && iv.status !== "cancelled");

  const bookedSlotsForDay = new Set(
    getDateInterviews(selectedDateStr).map(iv => {
      const d = new Date(iv.scheduledAt);
      return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    })
  );

  const isToday = (d: number) => d === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  const isPast = (d: number) => new Date(viewYear, viewMonth, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hasInterview = (d: number) => {
    const ds = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return getDateInterviews(ds).length > 0;
  };

  const upcoming = interviews.filter(iv => new Date(iv.scheduledAt) >= new Date() && iv.status === "scheduled");
  const past = interviews.filter(iv => new Date(iv.scheduledAt) < new Date() || iv.status === "completed");

  const isJoinable = (iv: Interview) => {
    const t = new Date(iv.scheduledAt).getTime();
    return Date.now() >= t - 5*60000 && Date.now() <= t + 40*60000 && iv.status !== "cancelled";
  };

  const isOfficer = user?.role === "officer" || user?.role === "admin";

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      {/* Header */}
      <div className="vf-header">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a2035" }}>
          Interview <span style={{ color: "#6c5dd3" }}>Slot Manager</span>
        </h1>
        {!isOfficer && (
          <button
            onClick={() => {
              if (!appsLoading) setBookOpen(true);
            }}
            disabled={appsLoading}
            style={{ height: 36, padding: "0 18px", background: "#6c5dd3", color: "#fff", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            {appsLoading ? "Loading..." : "+ Book Interview"}
          </button>
        )}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { icon: "📅", label: "TOTAL", value: interviews.length, bg: "#ede9ff" },
            { icon: "⏰", label: "UPCOMING", value: upcoming.length, bg: "#e0faf2" },
            { icon: "✅", label: "COMPLETED", value: interviews.filter(iv=>iv.status==="completed").length, bg: "#e0f0ff" },
            { icon: "🏆", label: "PASSED", value: interviews.filter(iv=>iv.interviewResult==="passed").length, bg: "#fff9e0" },
          ].map(s => (
            <div key={s.label} className="vf-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0" }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#1a2035" }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#fff", border: "1px solid #e8edf8", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {(["calendar","list"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ height: 32, padding: "0 20px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
                background: activeTab === tab ? "#6c5dd3" : "transparent", color: activeTab === tab ? "#fff" : "#718096", textTransform: "capitalize" }}>
              {tab === "calendar" ? "📅 Calendar View" : "📋 List View"}
            </button>
          ))}
        </div>

        {activeTab === "calendar" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
            {/* Calendar */}
            <div className="vf-card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035" }}>📅 Select Interview Day</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); }}
                    style={{ width:30,height:30,borderRadius:8,border:"1px solid #e8edf8",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ChevronLeft style={{width:14,height:14}}/>
                  </button>
                  <span style={{ fontWeight:700,fontSize:14,color:"#1a2035",minWidth:110,textAlign:"center" }}>{MONTHS[viewMonth]} {viewYear}</span>
                  <button onClick={() => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); }}
                    style={{ width:30,height:30,borderRadius:8,border:"1px solid #e8edf8",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ChevronRight style={{width:14,height:14}}/>
                  </button>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:8 }}>
                {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d=>(
                  <div key={d} style={{ textAlign:"center",fontSize:10,fontWeight:700,color:"#a0aec0",letterSpacing:"0.06em" }}>{d}</div>
                ))}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6 }}>
                {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
                  const selected = day===selectedDay;
                  const today = isToday(day);
                  const past = isPast(day);
                  const hasIv = hasInterview(day);
                  return (
                    <div key={day} onClick={()=>!past&&setSelectedDay(day)}
                      style={{
                        borderRadius:10,padding:"10px 6px 8px",textAlign:"center",cursor:past?"default":"pointer",
                        border:`2px solid ${selected?"#6c5dd3":"#e8edf8"}`,
                        background:selected?"#f5f3ff":today?"#fafbff":"#fff",
                        opacity:past?0.4:1,transition:"all 0.15s",position:"relative",
                      }}
                      onMouseEnter={e=>{if(!past&&!selected)(e.currentTarget as HTMLElement).style.background="#f8f9ff";}}
                      onMouseLeave={e=>{if(!selected)(e.currentTarget as HTMLElement).style.background=today?"#fafbff":"#fff";}}>
                      {today&&<div style={{position:"absolute",top:5,right:5,width:5,height:5,borderRadius:"50%",background:"#6c5dd3"}}/>}
                      {hasIv&&<div style={{position:"absolute",top:5,left:5,width:5,height:5,borderRadius:"50%",background:"#3dd598"}}/>}
                      <div style={{fontSize:10,color:"#a0aec0",fontWeight:600}}>{["SUN","MON","TUE","WED","THU","FRI","SAT"][new Date(viewYear,viewMonth,day).getDay()]}</div>
                      <div style={{fontSize:17,fontWeight:800,color:selected?"#6c5dd3":"#1a2035",marginTop:2}}>{day}</div>
                      {hasIv&&<div style={{fontSize:9,color:"#3dd598",fontWeight:600,marginTop:2}}>booked</div>}
                      <div style={{height:3,background:"#e8edf8",borderRadius:99,marginTop:6,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${((20-getDateInterviews(`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`).length)/20)*100}%`,background:"#3dd598",borderRadius:99}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right panel: time slots + day interviews */}
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div className="vf-card" style={{ padding:"18px 20px" }}>
                <div style={{ fontWeight:700,fontSize:14,color:"#1a2035",marginBottom:12 }}>
                  🕐 {MONTHS[viewMonth]} {selectedDay} — Available Slots
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  {TIME_SLOTS.map(slot=>{
                    const booked=bookedSlotsForDay.has(slot.value);
                    return (
                      <button key={slot.value}
                        onClick={()=>{if(!booked&&!isPast(selectedDay)&&!isOfficer){setSelectedSlot(slot.value);setBookOpen(true);}}}
                        style={{
                          padding:"8px 10px",borderRadius:8,textAlign:"center",
                          border:`1px solid ${booked?"#e8edf8":"#c8f0dd"}`,
                          background:booked?"#f8f9ff":"#f0faf5",
                          cursor:booked||isPast(selectedDay)||isOfficer?"default":"pointer",
                          transition:"all 0.15s",
                        }}
                        onMouseEnter={e=>{if(!booked&&!isPast(selectedDay)&&!isOfficer)(e.currentTarget as HTMLElement).style.background="#e0faf2";}}
                        onMouseLeave={e=>{if(!booked)(e.currentTarget as HTMLElement).style.background="#f0faf5";}}>
                        <div style={{fontWeight:700,fontSize:12,color:"#1a2035"}}>{slot.label}</div>
                        <div style={{fontSize:9,fontWeight:600,color:booked?"#a0aec0":"#3dd598",letterSpacing:"0.04em",marginTop:2}}>{booked?"BOOKED":"AVAILABLE"}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {getDateInterviews(selectedDateStr).length > 0 && (
                <div className="vf-card" style={{ padding:"18px 20px" }}>
                  <div style={{ fontWeight:700,fontSize:14,color:"#1a2035",marginBottom:12 }}>
                    Interviews — {MONTHS[viewMonth]} {selectedDay}
                  </div>
                  {getDateInterviews(selectedDateStr).map(iv=>{
                    const t=new Date(iv.scheduledAt);
                    const timeStr=t.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
                    const joinable=isJoinable(iv);
                    return (
                      <div key={iv.id} style={{ padding:"10px 0",borderBottom:"1px solid #f0f4ff",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                        <div>
                          <div style={{ fontWeight:700,fontSize:13,color:"#6c5dd3" }}>{timeStr}</div>
                          <div style={{ fontSize:11,color:"#a0aec0" }}>{iv.officerName} · {iv.visaType} Visa</div>
                          <div style={{ marginTop:4 }}><StatusBadge status={iv.status} result={iv.interviewResult}/></div>
                        </div>
                        <div style={{ display:"flex",gap:6 }}>
                          {joinable ? (
                            <button onClick={()=>window.open(`https://meet.jit.si/${iv.roomName}`,"_blank")}
                              style={{ height:30,padding:"0 12px",background:"#3dd598",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
                              <Video style={{width:12,height:12}}/>Join
                            </button>
                          ) : (
                            <div style={{ height:30,padding:"0 12px",background:"#f0f4ff",color:"#a0aec0",border:"1px solid #e8edf8",borderRadius:8,fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4 }}>
                              <Lock style={{width:11,height:11}}/>Locked
                            </div>
                          )}
                          {iv.status==="scheduled"&&(
                            <button onClick={()=>{if(confirm("Cancel this interview?"))cancelMutation.mutate(iv.id);}}
                              style={{ height:30,padding:"0 10px",background:"#ffe8e8",color:"#ff6b6b",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer" }}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "list" && (
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            {/* Last Booked Panel */}
            {lastBooked && (
              <div className="vf-card" style={{ padding:"20px 22px", border:"2px solid #3dd598", background:"#f0fdf7" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
                  <CheckCircle style={{width:18,height:18,color:"#3dd598"}}/>
                  <span style={{ fontWeight:700,fontSize:15,color:"#1a2035" }}>Interview Booked Successfully</span>
                  <span style={{ background:"#e0faf2",color:"#00a86b",padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:700 }}>BOOKED</span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                  <div style={{ background:"#fff",border:"1px solid #e8edf8",borderRadius:10,padding:"12px 14px" }}>
                    <div style={{ fontSize:10,color:"#a0aec0",fontWeight:700,letterSpacing:"0.06em",marginBottom:4 }}>SCHEDULED WITH</div>
                    <div style={{ fontSize:14,fontWeight:700,color:"#1a2035" }}>{lastBooked.officerName}</div>
                    <div style={{ fontSize:12,color:"#6c5dd3",fontWeight:500 }}>{lastBooked.visaType} Visa Officer</div>
                  </div>
                  <div style={{ background:"#fff",border:"1px solid #e8edf8",borderRadius:10,padding:"12px 14px" }}>
                    <div style={{ fontSize:10,color:"#a0aec0",fontWeight:700,letterSpacing:"0.06em",marginBottom:4 }}>DATE & TIME</div>
                    <div style={{ fontSize:13,fontWeight:700,color:"#1a2035" }}>
                      {new Date(lastBooked.scheduledAt).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                    </div>
                    <div style={{ fontSize:13,color:"#6c5dd3",fontWeight:600 }}>
                      {new Date(lastBooked.scheduledAt).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})} · 30 min
                    </div>
                  </div>
                </div>
                <JitsiLinkPanel interview={lastBooked} />
                <p style={{ fontSize:11,color:"#718096",marginTop:10,textAlign:"center" }}>
                  📧 The assigned officer has been notified of this booking.
                </p>
              </div>
            )}

            {/* Upcoming */}
            <div className="vf-card" style={{ overflow:"hidden" }}>
              <div style={{ padding:"16px 20px",borderBottom:"1px solid #f0f4ff",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ fontWeight:700,fontSize:15,color:"#1a2035" }}>⏰ Upcoming Interviews</div>
                <span style={{ background:"#ede9ff",color:"#6c5dd3",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600 }}>{upcoming.length} scheduled</span>
              </div>
              {upcoming.length===0?(
                <div style={{ padding:40,textAlign:"center",color:"#a0aec0" }}>No upcoming interviews. Book one above!</div>
              ):(
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #e8edf8" }}>
                      {["DATE & TIME","OFFICER / APPLICANT","VISA TYPE","STATUS","ACTIONS"].map(h=>(
                        <th key={h} style={{ padding:"10px 16px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0",textAlign:"left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map(iv=>{
                      const d=new Date(iv.scheduledAt);
                      const joinable=isJoinable(iv);
                      return (
                        <tr key={iv.id} style={{ borderBottom:"1px solid #f0f4ff" }}>
                          <td style={{ padding:"14px 16px" }}>
                            <div style={{ fontWeight:700,fontSize:13,color:"#1a2035" }}>{d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
                            <div style={{ fontSize:12,color:"#6c5dd3",fontWeight:600 }}>{d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</div>
                          </td>
                          <td style={{ padding:"14px 16px",fontSize:13,color:"#1a2035",fontWeight:500 }}>
                            {isOfficer ? iv.applicantName : iv.officerName}
                          </td>
                          <td style={{ padding:"14px 16px",fontSize:13,color:"#718096",textTransform:"capitalize" }}>{iv.visaType} Visa</td>
                          <td style={{ padding:"14px 16px" }}>
                            <span style={{ background:"#e0faf2",color:"#00a86b",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4 }}>
                              <CheckCircle style={{width:11,height:11}}/>BOOKED
                            </span>
                          </td>
                          <td style={{ padding:"14px 16px" }}>
                            <div style={{ display:"flex",gap:6 }}>
                              {joinable ? (
                                <button onClick={()=>window.open(`https://meet.jit.si/${iv.roomName}`,"_blank")}
                                  style={{ height:30,padding:"0 12px",background:"#3dd598",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
                                  <Video style={{width:12,height:12}}/>Join Now
                                </button>
                              ) : (
                                <div style={{ height:30,padding:"0 12px",background:"#f0f4ff",color:"#a0aec0",border:"1px solid #e8edf8",borderRadius:8,fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4 }}>
                                  <Lock style={{width:11,height:11}}/>
                                  {d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
                                </div>
                              )}
                              {!isOfficer && (
                                <button onClick={()=>{if(confirm("Cancel?"))cancelMutation.mutate(iv.id);}}
                                  style={{ height:30,padding:"0 10px",background:"#ffe8e8",color:"#ff6b6b",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer" }}>
                                  Cancel
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

            {/* Past */}
            {past.length>0&&(
              <div className="vf-card" style={{ overflow:"hidden" }}>
                <div style={{ padding:"16px 20px",borderBottom:"1px solid #f0f4ff",fontWeight:700,fontSize:15,color:"#1a2035" }}>📋 Past Interviews</div>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #e8edf8" }}>
                      {["DATE & TIME","OFFICER / APPLICANT","VISA TYPE","RESULT","NOTES"].map(h=>(
                        <th key={h} style={{ padding:"10px 16px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0",textAlign:"left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {past.map(iv=>{
                      const d=new Date(iv.scheduledAt);
                      return (
                        <tr key={iv.id} style={{ borderBottom:"1px solid #f0f4ff" }}>
                          <td style={{ padding:"14px 16px" }}>
                            <div style={{ fontSize:13,color:"#718096" }}>{d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                            <div style={{ fontSize:11,color:"#a0aec0" }}>{d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</div>
                          </td>
                          <td style={{ padding:"14px 16px",fontSize:13,color:"#1a2035" }}>
                            {isOfficer ? iv.applicantName : iv.officerName}
                          </td>
                          <td style={{ padding:"14px 16px",fontSize:13,color:"#718096",textTransform:"capitalize" }}>{iv.visaType} Visa</td>
                          <td style={{ padding:"14px 16px" }}><StatusBadge status={iv.status} result={iv.interviewResult}/></td>
                          <td style={{ padding:"14px 16px",fontSize:12,color:"#718096",maxWidth:200 }}>{iv.officerNotes||"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Book Interview Dialog */}
      <Dialog open={bookOpen} onOpenChange={v=>{setBookOpen(v);if(!v){setSelectedSlot("");setRequestNote("");}}}>
        <DialogContent style={{ maxWidth:460 }}>
          <DialogHeader>
            <DialogTitle style={{ display:"flex",alignItems:"center",gap:8 }}>
              <Video style={{width:18,height:18,color:"#6c5dd3"}}/> Book Interview Slot
            </DialogTitle>
          </DialogHeader>
          <div style={{ display:"flex",flexDirection:"column",gap:14,paddingTop:4 }}>
            {/* Selected date & time preview */}
            <div style={{ background:"#f5f3ff",border:"1px solid #c8bfff",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10 }}>
              <span style={{fontSize:20}}>📅</span>
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:"#6c5dd3" }}>
                  {MONTHS[viewMonth]} {selectedDay}, {viewYear}
                  {selectedSlot&&` at ${TIME_SLOTS.find(s=>s.value===selectedSlot)?.label}`}
                </div>
                <div style={{ fontSize:11,color:"#a0aec0" }}>30-minute video interview session</div>
              </div>
            </div>

            {/* Application info (auto-selected, no picker) */}
            {appsLoading ? (
              <div style={{ background:"#f8f9ff",border:"1px solid #e8edf8",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#718096" }}>
                Loading your application...
              </div>
            ) : selectedApplication ? (
              <div style={{ background:"#f8f9ff",border:"1px solid #e8edf8",borderRadius:10,padding:"12px 14px" }}>
                <div style={{ fontSize:10,color:"#a0aec0",fontWeight:700,letterSpacing:"0.06em",marginBottom:4 }}>APPLICATION</div>
                <div style={{ fontSize:13,fontWeight:700,color:"#1a2035" }}>
                  #{selectedApplication.id} — {selectedApplication.visaType?.charAt(0).toUpperCase()}{selectedApplication.visaType?.slice(1)} Visa
                </div>
                <div style={{ fontSize:12,color:"#718096" }}>→ {selectedApplication.destinationCountry}</div>
              </div>
            ) : (
              <div style={{ background:"#ffe8e8",border:"1px solid #ffb3b3",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#e53535" }}>
                ⚠ No active application found. Please submit a visa application first.
              </div>
            )}

            {/* Time slot selector (only if not pre-selected from calendar) */}
            {!selectedSlot && (
              <div>
                <Label style={{ fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:"#a0aec0" }}>SELECT TIME SLOT *</Label>
                <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                  <SelectTrigger style={{ marginTop:6,height:42,borderColor:"#e8edf8" }}>
                    <SelectValue placeholder="Choose a time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.filter(s=>!bookedSlotsForDay.has(s.value)).map(s=>(
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label style={{ fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:"#a0aec0" }}>NOTE (OPTIONAL)</Label>
              <textarea value={requestNote} onChange={e=>setRequestNote(e.target.value)}
                placeholder="Topics or questions you'd like to discuss..."
                style={{ width:"100%",marginTop:6,padding:"10px 12px",border:"1px solid #e8edf8",borderRadius:10,fontSize:13,outline:"none",resize:"none",height:64,fontFamily:"inherit",boxSizing:"border-box",color:"#1a2035" }}/>
            </div>

            <div style={{ background:"#f0fdf7",border:"1px solid #c8f0dd",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#00a86b",fontWeight:500 }}>
              🔒 A unique Jitsi video link will be generated for this session. It will only be active during your scheduled time window. The assigned officer will be notified automatically.
            </div>
          </div>
          <DialogFooter style={{ marginTop:8 }}>
            <button onClick={()=>{setBookOpen(false);setSelectedSlot("");setRequestNote("");}}
              style={{ height:38,padding:"0 16px",border:"1px solid #e8edf8",borderRadius:10,background:"#fff",cursor:"pointer",fontSize:13,color:"#718096" }}>
              Cancel
            </button>
              <button onClick={()=>bookMutation.mutate()}
              disabled={!canBook||!selectedSlot||bookMutation.isPending}
              style={{ height:38,padding:"0 24px",border:"none",borderRadius:10,
                background:(!canBook||!selectedSlot)?"#c8bfff":"#6c5dd3",
                color:"#fff",cursor:(!canBook||!selectedSlot)?"not-allowed":"pointer",fontSize:13,fontWeight:700 }}>
              {bookMutation.isPending?"Booking...":"Confirm Booking"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
