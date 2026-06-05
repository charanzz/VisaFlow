import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FilePlus, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";

interface Application {
  id: number; applicationType: string; visaType: string;
  destinationCountry: string; status: string; currentStage: number;
  riskLevel: string | null; riskScore: number | null;
  createdAt: string; expiryDate: string | null;
}
interface Stats {
  total: number; pending: number; granted: number; denied: number;
  inReview?: number; blockchainEntries?: number; highRisk?: number;
}

function getStatusBadge(status: string, t: (k: string) => string) {
  const map: Record<string, { cls: string; key: string; dot: string }> = {
    pending:          { cls: "badge-pending",    key: "dashboard.status.pending",         dot: "#d4a000" },
    document_review:  { cls: "badge-review",     key: "dashboard.status.document_review", dot: "#6c5dd3" },
    security_check:   { cls: "badge-security",   key: "dashboard.status.security_check",  dot: "#9333ea" },
    risk_assessment:  { cls: "badge-review",     key: "dashboard.status.risk_assessment", dot: "#6c5dd3" },
    blockchain_entry: { cls: "badge-blockchain", key: "dashboard.status.blockchain_entry",dot: "#0084b4" },
    granted:          { cls: "badge-granted",    key: "dashboard.status.granted",         dot: "#00a86b" },
    denied:           { cls: "badge-denied",     key: "dashboard.status.denied",          dot: "#e53535" },
    renewal_due:      { cls: "badge-orange",     key: "dashboard.status.renewal_due",     dot: "#ff9f43" },
  };
  const cfg = map[status] || { cls: "badge-pending", key: "", dot: "#888" };
  return (
    <span className={cfg.cls}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.key ? t(cfg.key) : status}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isOfficer = user?.role === "officer" || user?.role === "admin";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const applicationsQuery = useQuery<Application[]>({ queryKey: ["/api/applications"], enabled: !isOfficer });
  const allApplicationsQuery = useQuery<Application[]>({ queryKey: ["/api/applications/all"], enabled: isOfficer });
  const statsQuery = useQuery<Stats>({ queryKey: ["/api/stats/overview"] });

  const applications = isOfficer ? allApplicationsQuery.data : applicationsQuery.data;
  const isLoading = isOfficer ? allApplicationsQuery.isLoading : applicationsQuery.isLoading;
  const stats = statsQuery.data;

  const quickActions = [
    { icon: "✈️", label: t("dashboard.quickActions.arrivals"), sub: `8 ${t("dashboard.today").toLowerCase()}`, bg: "#f0ebff", color: "#6c5dd3" },
    { icon: "📋", label: t("dashboard.quickActions.docsDue"), sub: `${stats?.inReview ?? 0} ${t("officer.pending").toLowerCase()}`, bg: "#fff9e0", color: "#d4a000" },
    { icon: "🎥", label: t("dashboard.quickActions.interviews"), sub: `0 ${t("interviews.booked").toLowerCase()}`, bg: "#e8f0ff", color: "#4d9de0" },
    { icon: "🚩", label: t("dashboard.quickActions.flagged"), sub: `${stats?.highRisk ?? 0}`, bg: "#ffe8e8", color: "#ff6b6b" },
    { icon: "✅", label: t("dashboard.quickActions.approved"), sub: `${stats?.granted ?? 0} ${t("interviews.total").toLowerCase()}`, bg: "#e0faf2", color: "#3dd598" },
    { icon: "📊", label: t("dashboard.quickActions.reports"), sub: t("dashboard.quickActions.viewAll"), bg: "#f0f4ff", color: "#4d9de0" },
  ];

  const statCards = [
    { icon: "📋", label: t("dashboard.statCards.totalApps"), value: stats?.total ?? 0, sub: t("dashboard.statCards.monthGrowth"), subColor: "#3dd598", iconClass: "icon-purple" },
    { icon: "✅", label: t("dashboard.statCards.visaGranted"), value: stats?.granted ?? 0, sub: t("dashboard.statCards.approvalRate", { rate: stats?.total ? Math.round((stats.granted / stats.total) * 100) : 0 }), subColor: "#3dd598", iconClass: "icon-green" },
    { icon: "⏳", label: t("dashboard.statCards.underReview"), value: stats?.pending ?? 0, sub: t("dashboard.statCards.avgWait"), subColor: "#718096", iconClass: "icon-orange" },
    { icon: "🚫", label: t("dashboard.statCards.denied"), value: stats?.denied ?? 0, sub: t("dashboard.statCards.vsLastMonth"), subColor: "#ff6b6b", iconClass: "icon-red" },
  ];

  const bannerStats = [
    { label: t("dashboard.stats.total"),   value: stats?.total ?? 0,   color: "#fff" },
    { label: t("dashboard.stats.pending"), value: stats?.pending ?? 0, color: "#fff" },
    { label: t("dashboard.stats.granted"), value: stats?.granted ?? 0, color: "#3dd598" },
    { label: t("dashboard.stats.denied"),  value: stats?.denied ?? 0,  color: "#ff6b6b" },
  ];

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      {/* Page Header */}
      <div className="vf-header">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a2035" }}>
          {isOfficer ? t("dashboard.officerDashboard") : t("dashboard.myDashboard").replace("My ", "")} <span style={{ color: "#6c5dd3" }}>{t("sidebar.dashboard")}</span>
        </h1>
        {!isOfficer && (
          <Link href="/applications/new">
            <button data-testid="button-new-application"
              style={{ height: 36, padding: "0 18px", background: "#6c5dd3", color: "#fff", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <FilePlus style={{ width: 14, height: 14 }} /> {t("dashboard.newApplication")}
            </button>
          </Link>
        )}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Welcome Banner */}
        <div className="vf-banner" style={{ padding: "24px 28px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
              {t("dashboard.welcome")}, {user?.fullName?.split(" ")[0]} 👋
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {today}
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {bannerStats.map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {statCards.map(s => (
            <div key={s.label} className="vf-card" style={{ padding: "20px 22px", position: "relative", overflow: "hidden" }}
              data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div style={{ position: "absolute", right: -10, bottom: -10, width: 70, height: 70, borderRadius: "50%", background: "rgba(108,93,211,0.05)" }} />
              <div className={s.iconClass} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#1a2035", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: s.subColor, marginTop: 6, fontWeight: 500 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Two columns: Applications list + Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16 }}>
          {/* Applications List */}
          <div>
            <div className="vf-card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f4ff", fontWeight: 700, fontSize: 15, color: "#1a2035" }}>
                {isOfficer ? t("dashboard.allApplications") : t("dashboard.myApplications")}
              </div>
              {isLoading ? (
                <div style={{ padding: 20 }}>{[1,2,3].map(i => <div key={i} style={{ height: 56, background: "#f0f4ff", borderRadius: 8, marginBottom: 8 }} />)}</div>
              ) : !applications?.length ? (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <p style={{ color: "#a0aec0", fontSize: 14, fontWeight: 500 }}>{t("dashboard.noApplications")}</p>
                  {!isOfficer && (
                    <Link href="/applications/new">
                      <button style={{ marginTop: 12, height: 34, padding: "0 16px", background: "#6c5dd3", color: "#fff", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {t("dashboard.startFirstApplication")}
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <table className="vf-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>{t("dashboard.tableId")}</th>
                      <th>{t("dashboard.tableType")}</th>
                      <th>{t("dashboard.tableCountry")}</th>
                      <th>{t("dashboard.tableStatus")}</th>
                      <th>{t("dashboard.tableStage")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => (
                      <tr key={app.id} data-testid={`application-row-${app.id}`} style={{ cursor: "pointer" }}
                        onClick={() => window.location.href = `/applications/${app.id}`}>
                        <td><span style={{ color: "#6c5dd3", fontWeight: 600, fontSize: 13 }}>#{app.id}</span></td>
                        <td><span style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>{app.visaType} Visa</span></td>
                        <td style={{ fontSize: 13, color: "#718096" }}>{app.destinationCountry}</td>
                        <td>{getStatusBadge(app.status, t)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {[1,2,3,4,5,6].map(s => (
                              <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: s <= app.currentStage ? "#6c5dd3" : "#e8edf8" }} />
                            ))}
                            <span style={{ fontSize: 11, color: "#a0aec0", marginLeft: 4 }}>{app.currentStage}/6</span>
                          </div>
                        </td>
                        <td><ArrowRight style={{ width: 14, height: 14, color: "#a0aec0" }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick Actions + Activity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="vf-card" style={{ padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035", marginBottom: 14 }}>{t("dashboard.quickActions.title")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {quickActions.map(a => (
                  <div key={a.label} style={{ background: a.bg, borderRadius: 12, padding: "14px 12px", textAlign: "center", cursor: "pointer" }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{a.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{a.label}</div>
                    <div style={{ fontSize: 10, color: "#a0aec0", marginTop: 2 }}>{a.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="vf-card" style={{ padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035", marginBottom: 14 }}>{t("dashboard.recentActivity")}</div>
              {(applications ?? []).slice(0, 4).map(app => {
                const icons: Record<string, string> = { granted: "✅", denied: "❌", pending: "📋", document_review: "📄" };
                const colors: Record<string, string> = { granted: "#e0faf2", denied: "#ffe8e8", pending: "#fff9e0", document_review: "#ede9ff" };
                const actionLabel = app.status === "granted" ? t("dashboard.appGranted") : app.status === "denied" ? t("dashboard.appDenied") : t("dashboard.appUpdated");
                return (
                  <div key={app.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: colors[app.status] || "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {icons[app.status] || "📋"}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2035" }}>
                        App #{app.id} {actionLabel}
                      </div>
                      <div style={{ fontSize: 11, color: "#a0aec0" }}>
                        {new Date(app.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!applications?.length && (
                <div style={{ textAlign: "center", color: "#a0aec0", fontSize: 13, padding: "16px 0" }}>{t("dashboard.noRecentActivity")}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
