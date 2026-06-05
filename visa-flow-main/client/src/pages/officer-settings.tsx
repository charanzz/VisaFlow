import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

const SETTINGS_TABS = [
  { id: "profile",    icon: "👤", label: "Profile" },
  { id: "appearance", icon: "🎨", label: "Appearance" },
  { id: "notifications",icon: "🔔", label: "Notifications" },
  { id: "security",  icon: "🔐", label: "Security & Access" },
  { id: "workflow",  icon: "⚙️", label: "Workflow & SLA" },
  { id: "sessions",  icon: "🖥️", label: "Active Sessions" },
  { id: "danger",    icon: "🗑️", label: "Danger Zone" },
];

function FieldInput({ label, value, readOnly = false }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", marginBottom: 6 }}>{label}</div>
      <input defaultValue={value} readOnly={readOnly}
        style={{ width: "100%", height: 44, border: "1px solid #e8edf8", borderRadius: 10, padding: "0 14px",
          fontSize: 14, color: "#1a2035", background: readOnly ? "#f8f9ff" : "#fff", outline: "none",
          cursor: readOnly ? "default" : "text", boxSizing: "border-box" }} />
    </div>
  );
}

function ToggleRow({ label, sub, defaultOn = false }: { label: string; sub: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f0f4ff" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2035" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 2 }}>{sub}</div>
      </div>
      <div onClick={() => setOn(o => !o)}
        style={{ width: 44, height: 24, borderRadius: 99, background: on ? "#6c5dd3" : "#e8edf8", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
        <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
          left: on ? 23 : 3, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
      </div>
    </div>
  );
}

export default function OfficerSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);

  const nameParts = (user?.fullName || "Officer User").split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      <div className="vf-header">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a2035" }}>
          Portal <span style={{ color: "#6c5dd3" }}>Settings</span>
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer" }}>🔔</button>
          <button style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e8edf8", background: "#fff", cursor: "pointer" }}>🌙</button>
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Sidebar tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SETTINGS_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: "none", textAlign: "left",
                background: activeTab === tab.id ? "#fff" : "transparent",
                color: activeTab === tab.id ? "#1a2035" : "#718096",
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 14,
                boxShadow: activeTab === tab.id ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              }}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="vf-card" style={{ padding: 0, overflow: "hidden" }}>
          {activeTab === "profile" && (
            <>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f4ff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 15, color: "#1a2035" }}>
                  👤 Officer Profile
                </div>
                <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 2 }}>Your personal and official information</div>
              </div>

              {/* Avatar + Name Row */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f4ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {(() => {
                    const colors = ["#6c5dd3","#3dd598","#ff9f43","#4d9de0","#ff6b6b"];
                    const color = colors[(user?.fullName?.charCodeAt(0) || 0) % colors.length];
                    const initials = (user?.fullName || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);
                    return (
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>
                        {initials}
                      </div>
                    );
                  })()}
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#1a2035" }}>{user?.fullName}</div>
                    <div style={{ fontSize: 13, color: "#718096", marginTop: 2 }}>
                      Senior Visa Officer · {user?.assignedCountry || "Global"} Immigration
                    </div>
                    <span style={{ background: "#e0faf2", color: "#00a86b", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, marginTop: 4, display: "inline-block" }}>
                      ● Active
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#a0aec0", letterSpacing: "0.06em" }}>Employee ID</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1a2035", fontFamily: "monospace" }}>
                    OFF-{String(user?.id || 0).padStart(4,"0")}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <FieldInput label="FIRST NAME" value={firstName} />
                <FieldInput label="LAST NAME" value={lastName} />
                <FieldInput label="EMAIL" value={user?.email || ""} />
                <FieldInput label="PHONE" value={user?.phone || "+1 234 567 8900"} />
                <FieldInput label="EMPLOYEE ID" value={`OFF-${String(user?.id || 0).padStart(4,"0")}`} readOnly />
                <FieldInput label="DEPARTMENT" value={`${user?.assignedCountry || "Global"} Immigration`} />
                <FieldInput label="STATION" value="Central Entry Point" />
                <FieldInput label="ROLE" value="Senior Visa Officer" readOnly />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", marginBottom: 6 }}>LANGUAGE</div>
                  <select style={{ width: "100%", height: 44, border: "1px solid #e8edf8", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#1a2035", background: "#fff", outline: "none", cursor: "pointer" }}>
                    <option>English</option><option>Chinese</option><option>Spanish</option><option>French</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", marginBottom: 6 }}>TIMEZONE</div>
                  <select style={{ width: "100%", height: 44, border: "1px solid #e8edf8", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#1a2035", background: "#fff", outline: "none", cursor: "pointer" }}>
                    <option>Asia/Shanghai (GMT+8)</option><option>UTC</option><option>America/New_York (GMT-5)</option><option>Europe/London (GMT+0)</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a0aec0", marginBottom: 6 }}>BIO / NOTES</div>
                  <textarea defaultValue="Senior immigration officer with expertise in visa assessment and risk evaluation."
                    style={{ width: "100%", border: "1px solid #e8edf8", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#1a2035", outline: "none", resize: "none", height: 80, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ padding: "0 24px 24px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button style={{ height: 38, padding: "0 20px", border: "1px solid #e8edf8", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, color: "#718096" }}>
                  Cancel
                </button>
                <button onClick={handleSave}
                  style={{ height: 38, padding: "0 24px", border: "none", borderRadius: 10, background: saved ? "#3dd598" : "#6c5dd3", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "background 0.3s" }}>
                  {saved ? "✓ Saved!" : "Save Changes"}
                </button>
              </div>
            </>
          )}

          {activeTab === "notifications" && (
            <div style={{ padding: "24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035", marginBottom: 4 }}>🔔 Notification Preferences</div>
              <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>Manage how and when you receive alerts</div>
              <ToggleRow label="New Application Submitted" sub="Get notified when a new visa application arrives" defaultOn={true} />
              <ToggleRow label="Document Uploaded" sub="Alert when applicant uploads a document" defaultOn={true} />
              <ToggleRow label="High Risk Application" sub="Immediate alert for high-risk risk scores" defaultOn={true} />
              <ToggleRow label="Interview Scheduled" sub="Reminder when an interview is booked" defaultOn={true} />
              <ToggleRow label="Interview Reminder (1hr)" sub="Reminder 1 hour before interview" defaultOn={false} />
              <ToggleRow label="Application Overdue" sub="Alert when application exceeds SLA" defaultOn={true} />
              <ToggleRow label="Email Digest (Daily)" sub="Daily summary of activity" defaultOn={false} />
              <ToggleRow label="System Announcements" sub="Platform updates and maintenance notices" defaultOn={true} />
            </div>
          )}

          {activeTab === "security" && (
            <div style={{ padding: "24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035", marginBottom: 4 }}>🔐 Security & Access</div>
              <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>Manage your account security settings</div>
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ background: "#f8f9ff", border: "1px solid #e8edf8", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2035", marginBottom: 12 }}>Change Password</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {["Current Password","New Password","Confirm New Password"].map(p => (
                      <div key={p}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#a0aec0", marginBottom: 4 }}>{p.toUpperCase()}</div>
                        <input type="password" placeholder="••••••••" style={{ width: "100%", height: 40, border: "1px solid #e8edf8", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }} />
                      </div>
                    ))}
                    <button style={{ height: 38, border: "none", borderRadius: 10, background: "#6c5dd3", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      Update Password
                    </button>
                  </div>
                </div>
                <ToggleRow label="Two-Factor Authentication" sub="Add extra security with 2FA" defaultOn={false} />
                <ToggleRow label="Login Notifications" sub="Get alerted on new sign-ins" defaultOn={true} />
                <ToggleRow label="Session Timeout (30min)" sub="Auto-logout after inactivity" defaultOn={true} />
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div style={{ padding: "24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035", marginBottom: 4 }}>🎨 Appearance</div>
              <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>Customize how the portal looks</div>
              <ToggleRow label="Dark Mode" sub="Switch between light and dark theme" defaultOn={false} />
              <ToggleRow label="Compact View" sub="Reduce spacing in application tables" defaultOn={false} />
              <ToggleRow label="Show Risk Bars" sub="Display color-coded risk bars in tables" defaultOn={true} />
              <ToggleRow label="Animated Transitions" sub="Enable smooth page transitions" defaultOn={true} />
            </div>
          )}

          {activeTab === "workflow" && (
            <div style={{ padding: "24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035", marginBottom: 4 }}>⚙️ Workflow & SLA</div>
              <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>Configure processing rules and SLA targets</div>
              {[
                { label: "Target Processing Days", value: "3" },
                { label: "Auto-flag Risk Score Threshold (%)", value: "75" },
                { label: "Interview Duration (minutes)", value: "30" },
                { label: "Max Daily Interviews", value: "20" },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a0aec0", letterSpacing: "0.06em", marginBottom: 6 }}>{f.label.toUpperCase()}</div>
                  <input defaultValue={f.value} type="number"
                    style={{ width: 120, height: 40, border: "1px solid #e8edf8", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }} />
                </div>
              ))}
              <button onClick={handleSave}
                style={{ height: 38, padding: "0 24px", border: "none", borderRadius: 10, background: saved ? "#3dd598" : "#6c5dd3", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {saved ? "✓ Saved!" : "Save Settings"}
              </button>
            </div>
          )}

          {activeTab === "sessions" && (
            <div style={{ padding: "24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2035", marginBottom: 4 }}>🖥️ Active Sessions</div>
              <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>Devices currently logged in to your account</div>
              {[
                { device: "Chrome on Windows", location: "Shanghai, China", time: "Active now", current: true },
                { device: "Safari on iPhone", location: "Shanghai, China", time: "2 hours ago", current: false },
                { device: "Firefox on Mac", location: "Beijing, China", time: "Yesterday", current: false },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f0f4ff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {s.device.includes("iPhone") ? "📱" : "💻"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2035" }}>{s.device}</div>
                      <div style={{ fontSize: 12, color: "#a0aec0" }}>{s.location} · {s.time}</div>
                    </div>
                  </div>
                  {s.current ? (
                    <span style={{ background: "#e0faf2", color: "#00a86b", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Current</span>
                  ) : (
                    <button style={{ height: 28, padding: "0 12px", background: "#ffe8e8", color: "#ff6b6b", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "danger" && (
            <div style={{ padding: "24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#ff6b6b", marginBottom: 4 }}>🗑️ Danger Zone</div>
              <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>Irreversible account actions</div>
              <div style={{ border: "2px solid #ffe8e8", borderRadius: 12, padding: "20px", marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2035", marginBottom: 4 }}>Reset All Settings</div>
                <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 14 }}>Revert all preferences to factory defaults</div>
                <button style={{ height: 34, padding: "0 16px", border: "1px solid #ff6b6b", borderRadius: 8, background: "#fff", color: "#ff6b6b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Reset Settings
                </button>
              </div>
              <div style={{ border: "2px solid #ffe8e8", borderRadius: 12, padding: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#ff6b6b", marginBottom: 4 }}>Deactivate Account</div>
                <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 14 }}>Permanently disable your officer account. This cannot be undone.</div>
                <button style={{ height: 34, padding: "0 16px", border: "none", borderRadius: 8, background: "#ff6b6b", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Deactivate Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
