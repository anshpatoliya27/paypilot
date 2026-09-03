import React, { useState } from "react";
import { 
  Zap, 
  X, 
  CheckCircle2, 
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ background: "var(--info-bg)", padding: "0.5rem", borderRadius: "var(--radius-md)", color: "var(--info-text)" }}>
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
          <div style={{ padding: "1.25rem 0.5rem", textAlign: "center" }}>
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
            <h4 style={{ fontSize: "1.05rem", color: "var(--text-main)", fontWeight: "700", marginBottom: "0.35rem" }}>
              Webhook Captured & Reconciled!
            </h4>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: "1.45" }}>
              {result.message}
            </p>
            <div style={{ background: "var(--bg-surface-subtle)", border: "1px solid var(--border-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Razorpay Payment ID: <strong>{result.payment_id}</strong> • Status: <strong>Captured</strong>
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ width: "100%" }}>
              Done & View Updated Ledger
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: "1.5" }}>
              This tool emulates an official <code>payment.captured</code> webhook from Razorpay servers. PayPilot will verify the event signature, update the customer's balance, and log an immutable audit entry.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                  Select Paying Customer
                </label>
                <select 
                  className="chat-input"
                  style={{ width: "100%", background: "#ffffff" }}
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
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
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

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem" }}>
              <button className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                disabled={simulating}
                onClick={handleSimulate}
              >
                <Zap size={14} />
                {simulating ? "Reconciling..." : `Simulate ₹${amount?.toLocaleString("en-IN") || 0} Payment Capture`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
