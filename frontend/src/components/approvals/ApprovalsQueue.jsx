import React, { useState } from "react";
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from "lucide-react";
import ActionCard from "../agent/ActionCard";

export default function ApprovalsQueue({ 
  approvals, 
  onRefreshData 
}) {
  const [filter, setFilter] = useState("PENDING");

  const filtered = (approvals || []).filter(a => {
    if (filter === "ALL") return true;
    return a.status === filter;
  });

  const pendingCount = (approvals || []).filter(a => a.status === "PENDING").length;

  return (
    <div>
      <div className="table-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <ShieldCheck size={18} color="var(--primary)" />
              Human-in-the-Loop (HITL) Financial Approvals
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              PayPilot enforces deterministic review before mutating financial state or creating external Razorpay payment links.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.45rem" }}>
            <button 
              className={`btn btn-sm ${filter === "PENDING" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setFilter("PENDING")}
            >
              Pending ({pendingCount})
            </button>
            <button 
              className={`btn btn-sm ${filter === "EXECUTED" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setFilter("EXECUTED")}
            >
              Executed
            </button>
            <button 
              className={`btn btn-sm ${filter === "ALL" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setFilter("ALL")}
            >
              All History
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="table-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <CheckCircle size={32} color="var(--success)" style={{ margin: "0 auto 0.75rem" }} />
          <h4 style={{ color: "#fff", fontSize: "1rem", marginBottom: "0.25rem" }}>No Approvals in this Queue</h4>
          <p style={{ fontSize: "0.82rem" }}>All agent-staged financial proposals have been reviewed and resolved.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map(appr => (
            <ActionCard 
              key={appr.id} 
              proposal={appr} 
              onActionResolved={onRefreshData} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
