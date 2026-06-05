import { useState, useRef, useEffect } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Link } from "wouter";
import { Eye, Download, ChevronDown, ChevronRight, FolderOpen, Folder, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface DocRecord {
  id: number; applicationId: number; documentType: string; fileName: string;
  fileUrl: string | null; fileSize: number | null; mimeType: string | null;
  verified: boolean; aiConfidenceScore: number | null; aiVerificationNotes: string | null;
  uploadedAt: string; applicantName?: string; applicantNationality?: string;
}

interface ApplicantGroup {
  name: string;
  nationality: string;
  applicationId: number;
  docs: DocRecord[];
}

function AvatarCircle({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ["#6c5dd3","#3dd598","#ff9f43","#4d9de0","#ff6b6b","#ffd166","#9b59b6"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size*0.33, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

const DOC_CATEGORIES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  passport:    { label: "Passport & ID",      icon: "🪪", color: "#6c5dd3", bg: "#ede9ff" },
  photo:       { label: "Visa Application",   icon: "📋", color: "#ff9f43", bg: "#fff3e0" },
  financial:   { label: "Supporting Docs",    icon: "📁", color: "#ff9f43", bg: "#fff3e0" },
  invitation:  { label: "Supporting Docs",    icon: "📁", color: "#ff9f43", bg: "#fff3e0" },
  itinerary:   { label: "Supporting Docs",    icon: "📁", color: "#ff9f43", bg: "#fff3e0" },
  insurance:   { label: "Medical & BGC",      icon: "🏥", color: "#9b59b6", bg: "#f3e8ff" },
  medical:     { label: "Medical & BGC",      icon: "🏥", color: "#9b59b6", bg: "#f3e8ff" },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: "Passport Copy", photo: "Visa Application Form", financial: "Bank Statement",
  invitation: "Invitation Letter", itinerary: "Travel Itinerary", insurance: "Medical Certificate", medical: "Medical Report",
};

function getGroupStatus(docs: DocRecord[]): { label: string; color: string; bg: string; icon: any } {
  if (docs.length === 0) return { label: "No Docs", color: "#a0aec0", bg: "#f0f4ff", icon: Clock };
  const allVerified = docs.every(d => d.verified);
  const someVerified = docs.some(d => d.verified);
  if (allVerified) return { label: "All Verified", color: "#00a86b", bg: "#e0faf2", icon: CheckCircle2 };
  if (someVerified) return { label: "In Progress", color: "#6c5dd3", bg: "#ede9ff", icon: Clock };
  return { label: "Pending Review", color: "#d4a000", bg: "#fff9e0", icon: AlertCircle };
}

function DocStatusBadge({ verified, hasNotes }: { verified: boolean; hasNotes?: boolean }) {
  if (verified) return (
    <span style={{ background: "#e0faf2", color: "#00a86b", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <CheckCircle2 style={{ width: 10, height: 10 }} /> Verified
    </span>
  );
  if (hasNotes) return (
    <span style={{ background: "#ffe8e8", color: "#e53535", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Resubmit</span>
  );
  return (
    <span style={{ background: "#fff9e0", color: "#d4a000", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Clock style={{ width: 10, height: 10 }} /> Pending
    </span>
  );
}

export default function OfficerDocuments() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [expandedApplicants, setExpandedApplicants] = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: apps = [], isLoading: appsLoading } = useQuery<any[]>({
    queryKey: ["/api/applications/all"],
    queryFn: async () => {
      const token = localStorage.getItem("visa_token");
      const res = await fetch("/api/applications/all", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Parallel per-application doc fetches — same query keys as the dashboard popup
  // so TanStack Query deduplicates and shares cache between the two pages
  const docQueries = useQueries({
    queries: apps.map((app: any) => ({
      queryKey: [`/api/applications/${app.id}/documents`],
      queryFn: async () => {
        const token = localStorage.getItem("visa_token");
        const res = await fetch(`/api/applications/${app.id}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        const docs = await res.json();
        return docs.map((d: any) => ({
          ...d,
          applicantName: app.applicantName || `User #${app.userId}`,
          applicantNationality: app.destinationCountry,
          applicationId: app.id,
        }));
      },
      enabled: !appsLoading && apps.length > 0,
      staleTime: 30000,
    })),
  });

  const isLoading = appsLoading || docQueries.some(q => q.isLoading);
  const allDocs: DocRecord[] = docQueries.flatMap(q => (q.data as DocRecord[]) ?? []);

  const verifyMutation = useMutation({
    mutationFn: async ({ docId, documentType, fileName }: any) => {
      const token = localStorage.getItem("visa_token");
      const res = await fetch(`/api/documents/${docId}/verify`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentType, fileName }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_: any, vars: any) => {
      // Invalidate both the per-app key (shared with dashboard) and the aggregated list
      qc.invalidateQueries({ queryKey: [`/api/applications/${vars.applicationId}/documents`] });
      toast({ title: "✅ Document Verified", description: "Status updated successfully." });
    },
    onError: () => toast({ title: "Verification failed", variant: "destructive" }),
  });

  const resubmitMutation = useMutation({
    mutationFn: async ({ docId, documentType, fileName, applicationId }: any) => {
      const token = localStorage.getItem("visa_token");
      const res = await fetch(`/api/documents/${docId}/verify`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentType, fileName, forceResubmit: true }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_: any, vars: any) => {
      qc.invalidateQueries({ queryKey: [`/api/applications/${vars.applicationId}/documents`] });
      toast({ title: "Resubmit Requested" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  // Group docs by applicant
  const applicantMap = new Map<string, ApplicantGroup>();
  allDocs.forEach(doc => {
    const key = doc.applicantName || "Unknown";
    if (!applicantMap.has(key)) {
      applicantMap.set(key, {
        name: key,
        nationality: doc.applicantNationality || "",
        applicationId: doc.applicationId,
        docs: [],
      });
    }
    applicantMap.get(key)!.docs.push(doc);
  });

  const applicantGroups: ApplicantGroup[] = Array.from(applicantMap.values());

  const filteredGroups = applicantGroups.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.docs.some(d => d.fileName.toLowerCase().includes(q));
  });

  const totalDocs = allDocs.length;
  const totalVerified = allDocs.filter(d => d.verified).length;
  const totalPending = allDocs.filter(d => !d.verified).length;
  const totalResubmit = allDocs.filter(d => !d.verified && !!d.aiVerificationNotes).length;

  const toggleApplicant = (name: string) => {
    setExpandedApplicants(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      {/* Header */}
      <div className="vf-header">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a2035" }}>
          Document <span style={{ color: "#6c5dd3" }}>Management</span>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { icon: "📁", label: "TOTAL DOCS", value: totalDocs, iconBg: "#fff3e0" },
            { icon: "✅", label: "VERIFIED", value: totalVerified, iconBg: "#e0faf2" },
            { icon: "⏳", label: "PENDING REVIEW", value: totalPending, iconBg: "#fff9e0" },
            { icon: "🔄", label: "RESUBMIT NEEDED", value: totalResubmit, iconBg: "#ffe8e8" },
          ].map(s => (
            <div key={s.label} className="vf-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0" }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#1a2035" }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { icon: "🪪", label: "Passport & ID", count: allDocs.filter(d => d.documentType === "passport").length, color: "#6c5dd3", bg: "#ede9ff" },
            { icon: "📋", label: "Visa Application", count: allDocs.filter(d => d.documentType === "photo").length, color: "#ff9f43", bg: "#fff3e0" },
            { icon: "📁", label: "Supporting Docs", count: allDocs.filter(d => ["financial","invitation","itinerary"].includes(d.documentType)).length, color: "#ff9f43", bg: "#fff3e0" },
            { icon: "🏥", label: "Medical & BGC", count: allDocs.filter(d => ["insurance","medical"].includes(d.documentType)).length, color: "#9b59b6", bg: "#f3e8ff" },
          ].map(c => (
            <div key={c.label} className="vf-card" style={{ padding: "18px 20px" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035" }}>{c.label}</div>
              <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 2 }}>{c.count} document{c.count !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>

        {/* Applicant Grouped Documents */}
        <div className="vf-card" style={{ overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f4ff", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035", display: "flex", alignItems: "center", gap: 6 }}>
              <FolderOpen style={{ width: 16, height: 16, color: "#6c5dd3" }} />
              Applicant Document Folders
              <span style={{ background: "#ede9ff", color: "#6c5dd3", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, marginLeft: 4 }}>{filteredGroups.length} applicants</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => {
                  if (expandedApplicants.size === filteredGroups.length) {
                    setExpandedApplicants(new Set());
                  } else {
                    setExpandedApplicants(new Set(filteredGroups.map(g => g.name)));
                  }
                }}
                style={{ height: 30, padding: "0 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "1px solid #e8edf8", background: "#fff", color: "#718096" }}>
                {expandedApplicants.size === filteredGroups.length ? "Collapse All" : "Expand All"}
              </button>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a0aec0", fontSize: 13 }}>🔍</span>
                <input
                  placeholder="Search applicant or doc..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 32, paddingRight: 12, height: 34, border: "1px solid #e8edf8", borderRadius: 10, fontSize: 12, outline: "none", width: 220, background: "#f8f9ff" }}
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#a0aec0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              Loading applicant documents...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center", color: "#a0aec0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>No documents found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>No applicants have uploaded documents yet</div>
            </div>
          ) : (
            <div>
              {filteredGroups.map((group, gi) => {
                const isExpanded = expandedApplicants.has(group.name);
                const status = getGroupStatus(group.docs);
                const StatusIcon = status.icon;
                const verifiedCount = group.docs.filter(d => d.verified).length;

                return (
                  <div key={group.name} style={{ borderBottom: gi < filteredGroups.length - 1 ? "1px solid #f0f4ff" : "none" }}>
                    {/* Applicant Row (clickable header) */}
                    <div
                      onClick={() => toggleApplicant(group.name)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                        cursor: "pointer", transition: "background 0.15s",
                        background: isExpanded ? "#fafbff" : "#fff",
                      }}
                      onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = "#f8f9ff"; }}
                      onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = "#fff"; }}
                    >
                      {/* Expand chevron */}
                      <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#a0aec0", flexShrink: 0 }}>
                        {isExpanded
                          ? <ChevronDown style={{ width: 16, height: 16, color: "#6c5dd3" }} />
                          : <ChevronRight style={{ width: 16, height: 16 }} />}
                      </div>

                      {/* Folder icon */}
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: isExpanded ? "#ede9ff" : "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "background 0.15s" }}>
                        {isExpanded ? <FolderOpen style={{ width: 18, height: 18, color: "#6c5dd3" }} /> : <Folder style={{ width: 18, height: 18, color: "#718096" }} />}
                      </div>

                      {/* Avatar + Name */}
                      <AvatarCircle name={group.name} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035" }}>{group.name}</div>
                        <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 1 }}>
                          {group.nationality && <span>{group.nationality} · </span>}
                          App #{group.applicationId}
                        </div>
                      </div>

                      {/* Doc count */}
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color: "#1a2035" }}>{group.docs.length}</div>
                        <div style={{ fontSize: 10, color: "#a0aec0", fontWeight: 600 }}>DOCS</div>
                      </div>

                      {/* Progress */}
                      <div style={{ textAlign: "center", flexShrink: 0, minWidth: 80 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#718096", marginBottom: 4 }}>{verifiedCount}/{group.docs.length} verified</div>
                        <div style={{ width: 80, height: 5, background: "#e8edf8", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: group.docs.length ? `${(verifiedCount / group.docs.length) * 100}%` : "0%", background: verifiedCount === group.docs.length ? "#3dd598" : "#6c5dd3", borderRadius: 99, transition: "width 0.3s" }} />
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{ flexShrink: 0 }}>
                        <span style={{ background: status.bg, color: status.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <StatusIcon style={{ width: 11, height: 11 }} />
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Expanded: individual documents */}
                    {isExpanded && (
                      <div style={{ background: "#f8f9ff", borderTop: "1px solid #ede9ff" }}>
                        {group.docs.length === 0 ? (
                          <div style={{ padding: "24px 60px", color: "#a0aec0", fontSize: 13 }}>No documents uploaded yet</div>
                        ) : (
                          <div style={{ padding: "12px 20px 12px 76px" }}>
                            {/* Column headers */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 100px 180px", gap: 12, padding: "6px 0 8px", borderBottom: "1px solid #e8edf8", marginBottom: 8 }}>
                              {["DOCUMENT TYPE", "CATEGORY", "UPLOADED", "STATUS", "ACTIONS"].map(h => (
                                <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0" }}>{h}</div>
                              ))}
                            </div>

                            {group.docs.map((doc, di) => {
                              const cat = DOC_CATEGORIES[doc.documentType] || { label: "Other", icon: "📄", color: "#718096", bg: "#f0f4ff" };
                              const label = DOC_TYPE_LABELS[doc.documentType] || doc.fileName;
                              const isPending = verifyMutation.isPending;

                              return (
                                <div key={doc.id} style={{
                                  display: "grid", gridTemplateColumns: "1fr 160px 120px 100px 180px",
                                  gap: 12, alignItems: "center", padding: "10px 0",
                                  borderBottom: di < group.docs.length - 1 ? "1px solid #f0f4ff" : "none",
                                }}>
                                  {/* Doc name */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                                      {cat.icon}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1a2035" }}>{label}</div>
                                      <div style={{ fontSize: 10, color: "#a0aec0" }}>
                                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : "—"}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Category */}
                                  <div>
                                    <span style={{ background: cat.bg, color: cat.color, padding: "3px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                                      {cat.label}
                                    </span>
                                  </div>

                                  {/* Upload date */}
                                  <div style={{ fontSize: 12, color: "#718096" }}>
                                    {new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </div>

                                  {/* Status */}
                                  <div>
                                    <DocStatusBadge verified={doc.verified} hasNotes={!!doc.aiVerificationNotes} />
                                  </div>

                                  {/* Actions */}
                                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    {doc.fileUrl && (
                                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <button style={{ height: 26, width: 26, borderRadius: 7, background: "#f0f4ff", color: "#6c5dd3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="View document">
                                          <Eye style={{ width: 12, height: 12 }} />
                                        </button>
                                      </a>
                                    )}
                                    {doc.fileUrl && (
                                      <a href={doc.fileUrl} download>
                                        <button style={{ height: 26, width: 26, borderRadius: 7, background: "#e0f0ff", color: "#4d9de0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Download">
                                          <Download style={{ width: 12, height: 12 }} />
                                        </button>
                                      </a>
                                    )}
                                    {!doc.verified ? (
                                      <button
                                        onClick={() => verifyMutation.mutate({ docId: doc.id, documentType: doc.documentType, fileName: doc.fileName, applicationId: doc.applicationId })}
                                        disabled={isPending}
                                        style={{ height: 26, padding: "0 10px", borderRadius: 7, background: "#6c5dd3", color: "#fff", border: "none", cursor: isPending ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600, opacity: isPending ? 0.7 : 1 }}>
                                        {isPending ? "…" : "Verify"}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => resubmitMutation.mutate({ docId: doc.id, documentType: doc.documentType, fileName: doc.fileName, applicationId: doc.applicationId })}
                                        style={{ height: 26, padding: "0 10px", borderRadius: 7, background: "#fff9e0", color: "#d4a000", border: "1px solid #f5dfa0", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                                        Resubmit
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* AI notes if any */}
                            {group.docs.some(d => d.aiVerificationNotes) && (
                              <div style={{ marginTop: 8, background: "#ede9ff", borderRadius: 8, padding: "8px 12px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6c5dd3", marginBottom: 4 }}>🤖 AI Verification Notes</div>
                                {group.docs.filter(d => d.aiVerificationNotes).map(d => (
                                  <div key={d.id} style={{ fontSize: 12, color: "#4a3d8f", marginBottom: 2 }}>
                                    <strong>{DOC_TYPE_LABELS[d.documentType] || d.documentType}:</strong> {d.aiVerificationNotes}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
