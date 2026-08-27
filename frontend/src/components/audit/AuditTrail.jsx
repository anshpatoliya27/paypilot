import React, { useState } from "react";
import { 
  History, 
  Bot, 
  User, 
  Zap, 
  Server, 
  Clock, 
  ShieldCheck 
} from "lucide-react";

export default function AuditTrail({ auditLogs }) {
  const [actorFilter, setActorFilter] = useState("ALL");

  const filtered = (auditLogs || []).filter(l => {
    if (actorFilter === "ALL") return true;
    return l.actor_type === actorFilter;
  });

  const getActorBadge = (actor) => {
    switch (actor) {
      case "AGENT":
        return <span className="badge badge-primary"><Bot size={11} /> Agent</span>;
      case "MERCHANT":
        return <span className="badge badge-medium"><User size={11} /> Merchant</span>;
      case "RAZORPAY_WEBHOOK":
        return <span className="badge badge-low"><Zap size={11} /> Razorpay Webhook</span>;
      default:
        return <span className="badge badge-info"><Server size={11} /> System</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " • " + d.toLocaleDateString();
  };

  return (
    <div className="table-card">
      <div className="table-header-box">
        <div className="table-title">
          <History size={18} color="var(--primary)" />
          Immutable Activity & Audit Trail
        </div>

        <div style={{ display: "flex", gap: "0.45rem" }}>
          {["ALL", "AGENT", "MERCHANT", "RAZORPAY_WEBHOOK"].map(act => (
            <button
              key={act}
              className={`btn btn-sm ${actorFilter === act ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActorFilter(act)}
            >
              {act === "ALL" ? "All Events" : act.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action Type</th>
            <th>Event Details & Rationale</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(l => (
            <tr key={l.id}>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {formatDate(l.created_at)}
              </td>

              <td>
                {getActorBadge(l.actor_type)}
              </td>

              <td>
                <span style={{ fontWeight: "700", fontSize: "0.82rem", color: "#fff" }}>
                  {l.action}
                </span>
              </td>

              <td>
                <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--text-main)" }}>
                  {l.title}
                </div>
                {l.details && (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    {l.details}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
