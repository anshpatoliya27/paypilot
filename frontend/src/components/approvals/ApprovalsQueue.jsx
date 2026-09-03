import React, { useState } from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock 
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
      <div className="table-card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--text-main)" }}>
              <ShieldCheck size={18} color="var(--primary)" />
              Human-in-the-Loop (HITL) Financial Approvals
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              PayPilot enforces deterministic 2-phase verification before creating live Razorpay payment links or dispatching notifications.
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
        <div className="table-card" style={{ padding: "3.5rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "var(--success-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem"
          }}>
            <CheckCircle2 size={26} color="var(--success)" />
          </div>
          <h4 style={{ color: "var(--text-main)", fontSize: "1.05rem", fontWeight: "700", marginBottom: "0.3rem" }}>
            No Approvals in this Queue
          </h4>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
            All agent-staged financial proposals have been reviewed and resolved.
          </p>
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
