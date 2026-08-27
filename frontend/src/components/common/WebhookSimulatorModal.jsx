import React, { useState } from "react";
import { 
  Zap, 
  X, 
  CheckCircle2, 
  IndianRupee, 
  ShieldCheck 
} from "lucide-react";
import { simulateWebhookCapture } from "../../services/api";

export default function WebhookSimulatorModal({ 
  customers, 
  onClose, 
  onSuccess 
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers?.find(c => c.outstanding_balance > 0)?.id || ""
  );
  const [amount, setAmount] = useState(
    customers?.find(c => c.outstanding_balance > 0)?.outstanding_balance || 42000
  );
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState(null);

  const formatINR = (val) => {
    return "₹" + Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    const found = customers?.find(c => c.id === custId);
    if (found) {
      setAmount(found.outstanding_balance || 15000);
    }
  };

  const handleSimulate = async () => {
    if (!selectedCustomerId || !amount) return;
    setSimulating(true);
    try {
      const res = await simulateWebhookCapture(selectedCustomerId, amount);
      setResult(res);
      if (onSuccess) onSuccess(res);
    } catch (e) {
      console.error("Simulation error:", e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ background: "rgba(51, 149, 255, 0.15)", padding: "0.45rem", borderRadius: "var(--radius-sm)", color: "var(--rzp-blue)" }}>
              <Zap size={18} />
            </div>
            <div>
              <h3 className="modal-title">Razorpay Webhook Simulator</h3>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Test Real-time HMAC Webhook Reconciliation
              </div>
            </div>
          </div>

          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {result ? (
          <div style={{ padding: "1rem", textAlign: "center" }}>
            <CheckCircle2 size={38} color="var(--success)" style={{ margin: "0 auto 0.75rem" }} />
            <h4 style={{ fontSize: "1.05rem", color: "#fff", marginBottom: "0.35rem" }}>
              Webhook Captured & Reconciled!
            </h4>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {result.message}
            </p>
            <div style={{ background: "var(--bg-surface-raised)", padding: "0.65rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Razorpay Payment ID: {result.payment_id} • Status: Captured
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ width: "100%" }}>
              Done & View Updated Ledger
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: "1.45" }}>
              This tool emulates a live <code>payment.captured</code> webhook from Razorpay servers. PayPilot will verify the event, update the customer's balance, and log the audit entry.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.35rem" }}>
                  Select Paying Customer
                </label>
                <select 
                  className="chat-input"
                  style={{ width: "100%" }}
                  value={selectedCustomerId}
                  onChange={handleCustomerChange}
                >
                  {(customers || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company_name}) — Due: {formatINR(c.outstanding_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.35rem" }}>
                  Payment Amount (INR)
                </label>
                <input 
                  type="number"
                  className="chat-input"
                  style={{ width: "100%" }}
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value || 0))}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button 
                className="btn btn-rzp"
                disabled={simulating}
                onClick={handleSimulate}
              >
                <Zap size={14} color="#3395ff" />
                {simulating ? "Reconciling..." : `Simulate ₹${amount?.toLocaleString("en-IN") || 0} Payment Capture`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
