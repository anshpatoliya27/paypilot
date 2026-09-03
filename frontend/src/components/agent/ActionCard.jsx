import React, { useState } from "react";
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  Clock 
} from "lucide-react";
import { resolveApproval } from "../../services/api";

export default function ActionCard({ 
  proposal, 
  onActionResolved 
}) {
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const [status, setStatus] = useState(proposal.status || "PENDING");
  const [executionResult, setExecutionResult] = useState(proposal.execution_result || null);

  const formatINR = (val) => {
    return "₹" + Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  };

  const handleResolve = async (action) => {
    setLoading(true);
    try {
      const res = await resolveApproval(proposal.approval_id || proposal.id, action);
      if (res.status === "EXECUTED") {
        setStatus("EXECUTED");
        setExecutionResult(res.results);
      } else if (res.status === "REJECTED") {
        setStatus("REJECTED");
      }
      if (onActionResolved) onActionResolved(res);
    } catch (e) {
      console.error("Failed to resolve approval:", e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const targets = proposal.targets || (proposal.payload?.targets) || [];
  const totalAmount = proposal.total_amount || proposal.amount || proposal.payload?.amount || proposal.payload?.total_amount || 0;

  return (
    <div className="action-card">
      <div className="action-card-header">
        <div className="action-card-title">
          <ShieldCheck size={18} color="var(--primary)" />
          <span>{proposal.title}</span>
        </div>
        <span className={`badge badge-${(proposal.risk_level || "medium").toLowerCase()}`}>
          {proposal.risk_level || "MEDIUM"} RISK
        </span>
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.85rem", lineHeight: "1.45" }}>
        <strong style={{ color: "var(--text-main)" }}>Agent Rationale:</strong> {proposal.agent_reasoning}
      </p>

      {/* Target Recipient List */}
      {targets.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.85rem" }}>
          {targets.map((t, idx) => (
            <div key={idx} className="action-target-item">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: "700", color: "var(--text-main)" }}>
                  {t.customer_name} <span style={{ fontWeight: "500", color: "var(--text-muted)" }}>({t.company_name || "Client"})</span>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--primary)", fontSize: "0.92rem" }}>
                  {formatINR(t.amount)}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                Notify: {t.customer_phone} • {t.customer_email} • 48h Expiry
              </div>
              <div style={{ fontSize: "0.76rem", background: "#ffffff", border: "1px solid var(--border-subtle)", padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}>
                <em>"{t.custom_message}"</em>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="action-target-item">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <span style={{ fontWeight: "700", color: "var(--text-main)" }}>{proposal.customer_name || "Client"}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--primary)" }}>
              {formatINR(totalAmount)}
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Description: {proposal.description || "Payment Link"} • 48h Expiry
          </div>
        </div>
      )}

      {/* Execution Results if Approved */}
      {status === "EXECUTED" && (
        <div style={{
          background: "var(--success-bg)",
          border: "1px solid var(--success-border)",
          borderRadius: "var(--radius-md)",
          padding: "0.85rem",
          marginTop: "0.75rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--success-text)", fontWeight: "700", fontSize: "0.84rem", marginBottom: "0.5rem" }}>
            <CheckCircle size={15} /> Dispatched via Official Razorpay Rails
          </div>

          {executionResult && Array.isArray(executionResult) && executionResult.map((res, i) => (
            <div key={i} style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              fontSize: "0.8rem", 
              padding: "0.45rem 0", 
              borderTop: i > 0 ? "1px solid rgba(0,0,0,0.06)" : "none" 
            }}>
              <span style={{ fontWeight: "600", color: "var(--text-main)" }}>
                {res.customer_name || "Payment Link"} <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>({res.payment_link_id || res.id})</span>
              </span>
              <div style={{ display: "flex", gap: "0.45rem" }}>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => copyToClipboard(res.short_url, res.payment_link_id || res.id)}
                >
                  {copiedLink === (res.payment_link_id || res.id) ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                  Copy Link
                </button>
                <a 
                  href={res.short_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-primary btn-sm"
                >
                  <ExternalLink size={12} />
                  Checkout
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {status === "REJECTED" && (
        <div style={{
          background: "var(--danger-bg)",
          border: "1px solid var(--danger-border)",
          borderRadius: "var(--radius-md)",
          padding: "0.75rem",
          marginTop: "0.75rem",
          color: "var(--danger-text)",
          fontSize: "0.82rem",
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          fontWeight: "600"
        }}>
          <XCircle size={15} /> Action proposal rejected by merchant. No payment link was generated.
        </div>
      )}

      {/* Footer Controls */}
      {status === "PENDING" && (
        <div className="action-card-footer">
          <button 
            className="btn btn-danger btn-sm"
            disabled={loading}
            onClick={() => handleResolve("REJECT")}
          >
            <XCircle size={13} /> Reject
          </button>
          <button 
            className="btn btn-primary btn-sm"
            disabled={loading}
            onClick={() => handleResolve("APPROVE")}
          >
            {loading ? <Clock size={13} className="spin" /> : <Send size={13} />}
            Approve & Execute via Razorpay ({formatINR(totalAmount)})
          </button>
        </div>
      )}
    </div>
  );
}
