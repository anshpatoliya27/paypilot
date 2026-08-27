import React, { useState } from "react";
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  AlertTriangle, 
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
          {proposal.risk_level || "MEDIUM"} RISK IMPACT
        </span>
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
        <strong>Agent Rationale:</strong> {proposal.agent_reasoning}
      </p>

      {/* Target Recipient List */}
      {targets.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.75rem" }}>
          {targets.map((t, idx) => (
            <div key={idx} className="action-target-item">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                <span style={{ fontWeight: "700" }}>{t.customer_name} ({t.company_name || "Client"})</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--primary)" }}>
                  {formatINR(t.amount)}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                Notify: {t.customer_phone} • {t.customer_email} • 48h Expiry
              </div>
              <div style={{ fontSize: "0.74rem", background: "var(--bg-main)", padding: "0.3rem 0.5rem", borderRadius: "4px", color: "var(--text-secondary)" }}>
                <em>"{t.custom_message}"</em>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="action-target-item">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
            <span style={{ fontWeight: "700" }}>{proposal.customer_name || "Client"}</span>
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
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "var(--radius-sm)",
          padding: "0.75rem",
          marginTop: "0.65rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--success)", fontWeight: "700", fontSize: "0.82rem", marginBottom: "0.45rem" }}>
            <CheckCircle size={15} /> Dispatched via Official Razorpay Rails
          </div>

          {executionResult && Array.isArray(executionResult) && executionResult.map((res, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem", padding: "0.3rem 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span>{res.customer_name || "Payment Link"} ({res.payment_link_id || res.id})</span>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => copyToClipboard(res.short_url, res.payment_link_id || res.id)}
                >
                  {copiedLink === (res.payment_link_id || res.id) ? <Check size={12} /> : <Copy size={12} />}
                  Copy Link
                </button>
                <a 
                  href={res.short_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-rzp btn-sm"
                >
                  <ExternalLink size={12} />
                  Open Link
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {status === "REJECTED" && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "var(--radius-sm)",
          padding: "0.65rem",
          marginTop: "0.65rem",
          color: "#f87171",
          fontSize: "0.8rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem"
        }}>
          <XCircle size={15} /> Action proposal rejected by merchant.
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
            <XCircle size={14} /> Reject
          </button>
          <button 
            className="btn btn-success btn-sm"
            disabled={loading}
            onClick={() => handleResolve("APPROVE")}
          >
            {loading ? <Clock size={14} className="spin" /> : <Send size={14} />}
            Approve & Execute via Razorpay ({formatINR(totalAmount)})
          </button>
        </div>
      )}
    </div>
  );
}
