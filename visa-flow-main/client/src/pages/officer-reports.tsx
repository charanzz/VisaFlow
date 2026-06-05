import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

function BarChart({ data }: { data: { label: string; granted: number; denied: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.granted, d.denied]), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: 200, padding: "0 10px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 6, width: "100%" }}>
            <div style={{ flex: 1, background: "#3dd598", borderRadius: "4px 4px 0 0", height: `${(d.granted / max) * 100}%`, minHeight: 4, transition: "height 0.5s", position: "relative" }}>
              <span style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "#3dd598" }}>{d.granted}</span>
            </div>
            <div style={{ flex: 1, background: "#ff6b6b", borderRadius: "4px 4px 0 0", height: `${(d.denied / max) * 100}%`, minHeight: 4, transition: "height 0.5s", position: "relative" }}>
              <span style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "#ff6b6b" }}>{d.denied}</span>
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#718096", fontWeight: 600 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function exportDemoPDF(opts: {
  approvalRate: number;
  processed: number;
  avgDays: string;
  flagged: number;
  weeklyData: { label: string; granted: number; denied: number }[];
  period: string;
}) {
  const { approvalRate, processed, avgDays, flagged, weeklyData, period } = opts;
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const barMaxVal = Math.max(...weeklyData.flatMap(d => [d.granted, d.denied]), 1);
  const barHeight = 120;

  const barBars = weeklyData.map(d => {
    const gH = Math.round((d.granted / barMaxVal) * barHeight);
    const dH = Math.round((d.denied / barMaxVal) * barHeight);
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <div style="display:flex;align-items:flex-end;gap:4px;height:${barHeight}px;width:100%">
          <div style="flex:1;background:#3dd598;border-radius:4px 4px 0 0;height:${gH}px;display:flex;align-items:flex-start;justify-content:center;padding-top:4px">
            <span style="font-size:9px;font-weight:700;color:#fff">${d.granted}</span>
          </div>
          <div style="flex:1;background:#ff6b6b;border-radius:4px 4px 0 0;height:${dH}px;display:flex;align-items:flex-start;justify-content:center;padding-top:4px">
            <span style="font-size:9px;font-weight:700;color:#fff">${d.denied}</span>
          </div>
        </div>
        <span style="font-size:11px;color:#718096;font-weight:600">${d.label}</span>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>VisaFlow – Reports & Analytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a2035; padding: 40px 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #6c5dd3; }
    .logo { font-size: 24px; font-weight: 800; color: #6c5dd3; }
    .logo span { color: #1a2035; }
    .meta { text-align: right; font-size: 12px; color: #718096; }
    .meta strong { font-size: 13px; color: #1a2035; }
    .section-title { font-size: 14px; font-weight: 700; color: #1a2035; margin-bottom: 16px; display: flex; align-items: center; gap: 6px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 32px; }
    .kpi-card { border: 1px solid #e8edf8; border-radius: 12px; padding: 20px; background: #f8f9ff; }
    .kpi-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #a0aec0; margin-bottom: 8px; text-transform: uppercase; }
    .kpi-value { font-size: 36px; font-weight: 800; margin-bottom: 4px; }
    .kpi-sub { font-size: 11px; font-weight: 500; color: #3dd598; }
    .chart-card { border: 1px solid #e8edf8; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .chart-legend { display: flex; gap: 16px; font-size: 12px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; margin-right: 4px; }
    .bar-container { display: flex; align-items: flex-end; gap: 20px; height: ${barHeight + 40}px; margin-top: 20px; }
    .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .summary-table th { background: #f0f4ff; padding: 10px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: #6c5dd3; text-align: left; }
    .summary-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f0f4ff; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .badge-green { background: #e0faf2; color: #00a86b; }
    .badge-red { background: #ffe8e8; color: #ff6b6b; }
    .badge-yellow { background: #fff9e0; color: #d4a000; }
    .badge-purple { background: #ede9ff; color: #6c5dd3; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8edf8; display: flex; justify-content: space-between; font-size: 11px; color: #a0aec0; }
    @media print { body { padding: 24px 32px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Visa<span>Flow</span> <span style="font-size:13px;font-weight:500;color:#a0aec0">v2.0</span></div>
      <div style="font-size:13px;color:#718096;margin-top:4px">Officer Analytics & Reports</div>
    </div>
    <div class="meta">
      <strong>Report Period: This ${period.charAt(0).toUpperCase() + period.slice(1)}</strong><br/>
      Generated: ${now}<br/>
      <span style="color:#6c5dd3;font-weight:600">DEMO REPORT</span>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="section-title">📊 Key Performance Indicators</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Approval Rate</div>
      <div class="kpi-value" style="color:#6c5dd3">${approvalRate}%</div>
      <div class="kpi-sub">▲ +3% vs prev period</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Processed</div>
      <div class="kpi-value" style="color:#4d9de0">${processed}</div>
      <div class="kpi-sub">▲ +${Math.max(0, processed - 5)} vs prev period</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Processing Days</div>
      <div class="kpi-value" style="color:#3dd598">${avgDays}d</div>
      <div class="kpi-sub">▼ -0.2d vs prev period</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Flagged High-Risk</div>
      <div class="kpi-value" style="color:#ff9f43">${flagged}</div>
      <div class="kpi-sub">▲ -4 vs prev period</div>
    </div>
  </div>

  <!-- Bar Chart -->
  <div class="chart-card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="section-title" style="margin-bottom:0">📈 Decisions Over Time</div>
      <div class="chart-legend">
        <span><span class="legend-dot" style="background:#3dd598"></span>Granted</span>
        <span><span class="legend-dot" style="background:#ff6b6b"></span>Denied</span>
      </div>
    </div>
    <div class="bar-container">
      ${barBars}
    </div>
  </div>

  <!-- Summary Table -->
  <div class="section-title">📋 Weekly Summary Breakdown</div>
  <table class="summary-table">
    <thead>
      <tr>
        <th>PERIOD</th>
        <th>GRANTED</th>
        <th>DENIED</th>
        <th>TOTAL</th>
        <th>APPROVAL RATE</th>
        <th>OUTCOME</th>
      </tr>
    </thead>
    <tbody>
      ${weeklyData.map(w => {
        const tot = w.granted + w.denied;
        const rate = tot > 0 ? Math.round((w.granted / tot) * 100) : 0;
        const outcome = rate >= 70 ? `<span class="badge badge-green">High</span>` :
                        rate >= 50 ? `<span class="badge badge-yellow">Medium</span>` :
                                     `<span class="badge badge-red">Low</span>`;
        return `<tr>
          <td style="font-weight:600">${w.label}</td>
          <td><span class="badge badge-green">${w.granted}</span></td>
          <td><span class="badge badge-red">${w.denied}</span></td>
          <td style="font-weight:700">${tot}</td>
          <td><span class="badge badge-purple">${rate}%</span></td>
          <td>${outcome}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  <div class="footer">
    <span>VisaFlow Immigration Management System · Confidential</span>
    <span>DEMO DATA – For illustration purposes only</span>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
}

export default function OfficerReports() {
  const [period, setPeriod] = useState("month");

  const { data: apps = [] } = useQuery<any[]>({
    queryKey: ["/api/applications/all"],
    queryFn: async () => {
      const token = localStorage.getItem("visa_token");
      const res = await fetch("/api/applications/all", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const granted = apps.filter(a => a.status === "granted").length;
  const denied = apps.filter(a => a.status === "denied").length;
  const total = apps.length;
  const approvalRate = total > 0 ? Math.round((granted / total) * 100) : 74;
  const avgDays = apps.length ? (apps.reduce((s, a) => {
    const d = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86400000);
    return s + d;
  }, 0) / apps.length).toFixed(1) : "4.2";
  const flagged = apps.filter(a => a.riskLevel === "high").length || 7;

  const processedDemo = total || 142;
  const approvalRateDemo = total > 0 ? approvalRate : 74;
  const flaggedDemo = flagged;

  // Weekly chart data (last 4 weeks) — fallback to demo values
  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - (3 - i) * 7 - 7);
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() - (3 - i) * 7);
    const weekApps = apps.filter(a => {
      const d = new Date(a.createdAt);
      return d >= weekStart && d < weekEnd;
    });
    const demoGranted = [32, 28, 41, 35][i];
    const demoDenied = [8, 5, 11, 7][i];
    return {
      label: `Week ${i + 1}`,
      granted: weekApps.filter(a => a.status === "granted").length || demoGranted,
      denied: weekApps.filter(a => a.status === "denied").length || demoDenied,
    };
  });

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      <div className="vf-header">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a2035" }}>
          Reports & <span style={{ color: "#6c5dd3" }}>Analytics</span>
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer" }}>🔔</button>
          <button style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer" }}>🌙</button>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Period Selector + Export */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #e8edf8", borderRadius: 12, padding: 4 }}>
            {["week","month","quarter"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ height: 32, padding: "0 16px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
                  background: period === p ? "#6c5dd3" : "transparent", color: period === p ? "#fff" : "#718096" }}>
                This {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportDemoPDF({
              approvalRate: approvalRateDemo,
              processed: processedDemo,
              avgDays: String(avgDays),
              flagged: flaggedDemo,
              weeklyData,
              period,
            })}
            style={{ height: 36, padding: "0 20px", border: "none", borderRadius: 10, background: "#6c5dd3", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            ↓ Export PDF
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { label: "APPROVAL RATE", value: `${approvalRateDemo}%`, sub: "▲ +3% vs prev period", color: "#6c5dd3", subColor: "#3dd598" },
            { label: "PROCESSED", value: processedDemo, sub: `▲ +${Math.max(0, processedDemo - 5)} vs prev period`, color: "#4d9de0", subColor: "#3dd598" },
            { label: "AVG DAYS", value: `${avgDays}d`, sub: "▼ -0.2d vs prev period", color: "#3dd598", subColor: "#ff6b6b" },
            { label: "FLAGGED", value: flaggedDemo, sub: "▲ -4 vs prev period", color: "#ff9f43", subColor: "#3dd598" },
          ].map(s => (
            <div key={s.label} className="vf-card" style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: s.subColor, fontWeight: 500 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Decisions Over Time — full width */}
        <div className="vf-card" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035" }}>📊 Decisions Over Time</div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#3dd598", display: "inline-block" }} /> Granted
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ff6b6b", display: "inline-block" }} /> Denied
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 220, paddingBottom: 24 }}>
              {[45,35,25,15,5,0].map(v => (
                <span key={v} style={{ fontSize: 10, color: "#a0aec0", textAlign: "right" }}>{v}</span>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <BarChart data={weeklyData} />
            </div>
          </div>
          {/* Totals row */}
          <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f4ff" }}>
            {weeklyData.map(w => {
              const tot = w.granted + w.denied;
              const rate = tot > 0 ? Math.round((w.granted / tot) * 100) : 0;
              return (
                <div key={w.label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#a0aec0", fontWeight: 600, marginBottom: 4 }}>{w.label}</div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <span style={{ background: "#e0faf2", color: "#00a86b", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{w.granted} ✓</span>
                    <span style={{ background: "#ffe8e8", color: "#ff6b6b", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{w.denied} ✗</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6c5dd3", fontWeight: 700, marginTop: 4 }}>{rate}% approval</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
