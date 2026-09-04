import React, { useState, useEffect } from "react";
import { 
  X, 
  MessageCircle, 
  Copy, 
  Check, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Receipt,
  Send
} from "lucide-react";
import { generateWhatsAppLink, simulateInstantPayment, sendDirectWhatsApp } from "../../services/api";

export default function WhatsAppModal({ 
  customer, 
  billNo = "INV-PENDING", 
  amountRupees = 0, 
  paymentUrl = null, 
  onClose, 
  onPaymentSuccess,
  onSentDirect
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sendingDirect, setSendingDirect] = useState(false);
  const [directSent, setDirectSent] = useState(false);
  const [directResult, setDirectResult] = useState(null);

  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);
  const [simMessage, setSimMessage] = useState("");

  useEffect(() => {
    async function loadLink() {
      setLoading(true);
      try {
        const res = await generateWhatsAppLink({
          customer_name: customer?.name || "Client",
          phone: customer?.phone || "+919876543210",
          amount_rupees: amountRupees || customer?.outstanding_balance || 0,
          bill_no: billNo || "INV-BILL",
          payment_url: paymentUrl
        });
        setData(res);
      } catch (err) {
        console.error("Failed to generate WhatsApp link:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLink();
  }, [customer, billNo, amountRupees, paymentUrl]);

  const handleCopy = () => {
    if (data?.message) {
      navigator.clipboard.writeText(data.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Direct automated WhatsApp send in background (No WhatsApp interface opened)
  const handleSendDirect = async () => {
    setSendingDirect(true);
    try {
      const res = await sendDirectWhatsApp({
        customer_name: customer?.name || "Client",
        phone: customer?.phone || "+919876543210",
        amount_rupees: amountRupees || customer?.outstanding_balance || 0,
        bill_no: billNo || "INV-BILL",
        payment_url: data?.payment_url || paymentUrl
      });
      setDirectResult(res);
      setDirectSent(true);
      if (onSentDirect) onSentDirect(res);
    } catch (err) {
      alert("Failed to send direct WhatsApp: " + err.message);
    } finally {
      setSendingDirect(false);
    }
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const res = await simulateInstantPayment({
        invoice_no: billNo,
        customer_id: customer?.id,
        amount_rupees: amountRupees || customer?.outstanding_balance || 0
      });
      setSimSuccess(true);
      setSimMessage(res.message || "Payment of ₹" + amountRupees + " cleared and reconciled!");
      if (onPaymentSuccess) onPaymentSuccess(res);
    } catch (err) {
      alert("Simulation error: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1100,
      padding: "1rem"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border-subtle)",
        width: "100%",
        maxWidth: "520px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: "#075E54",
          padding: "1.25rem 1.5rem",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.2)",
              padding: "0.45rem",
              borderRadius: "50%",
              display: "flex"
            }}>
              <MessageCircle size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700" }}>
                Send WhatsApp Payment Reminder
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.76rem", opacity: 0.85 }}>
                Dispatched directly to mobile without opening WhatsApp
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "0.3rem",
              borderRadius: "6px",
              opacity: 0.8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: "1.5rem" }}>
          {/* Direct Send Success Confirmation */}
          {directSent ? (
            <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem"
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: "0 0 0.5rem", color: "#0f172a", fontSize: "1.1rem", fontWeight: "700" }}>
                WhatsApp Reminder Sent!
              </h4>
              <p style={{ margin: 0, color: "#475569", fontSize: "0.86rem", lineHeight: "1.5" }}>
                Message delivered directly to <strong>{customer?.phone || "+91 98251 00000"}</strong> from your linked WhatsApp device.
              </p>
              <div style={{
                marginTop: "1.25rem",
                padding: "0.85rem",
                background: "#f8fafc",
                borderRadius: "var(--radius-md)",
                border: "1px solid #e2e8f0",
                fontSize: "0.8rem",
                color: "#64748b",
                textAlign: "left"
              }}>
                ✅ Message ID: <code style={{ fontSize: "0.75rem" }}>{directResult?.message_id || "wamid_demo"}</code><br />
                ✅ Status: Delivered to recipient's phone<br />
                ✅ Payment Link: Included Razorpay UPI link
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button
                  className="btn btn-outline"
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  style={{ flex: 1, fontSize: "0.82rem", gap: "0.35rem" }}
                >
                  <Zap size={13} color="#f59e0b" />
                  {simulating ? "Reconciling..." : "Test Instant Paid"}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={onClose}
                  style={{ flex: 1, fontSize: "0.82rem" }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : simSuccess ? (
            <div style={{
              textAlign: "center",
              padding: "1.5rem 1rem"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem"
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: "0 0 0.5rem", color: "#0f172a", fontSize: "1.1rem", fontWeight: "700" }}>
                Payment Received & Reconciled!
              </h4>
              <p style={{ margin: 0, color: "#475569", fontSize: "0.85rem", lineHeight: "1.5" }}>
                {simMessage}
              </p>
              <div style={{
                marginTop: "1.25rem",
                padding: "0.85rem",
                background: "#f8fafc",
                borderRadius: "var(--radius-md)",
                border: "1px solid #e2e8f0",
                fontSize: "0.8rem",
                color: "#64748b"
              }}>
                ✅ Razorpay Webhook Verified • ✅ Balance Deducted in Ledger • ✅ Audit Log Created
              </div>
              <button
                className="btn btn-primary"
                onClick={onClose}
                style={{ marginTop: "1.5rem", width: "100%" }}
              >
                Close & View Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Customer & Bill Pills */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                background: "#f8fafc",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "1rem"
              }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>
                    Recipient
                  </div>
                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.95rem" }}>
                    {customer?.name || "Client"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#0284c7", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Phone size={11} /> {customer?.phone || "+919876543210"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>
                    Bill Amount
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: "800",
                    fontSize: "1.15rem",
                    color: "#dc2626"
                  }}>
                    ₹{Number(amountRupees || customer?.outstanding_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", display: "flex", alignItems: "center", gap: "3px", justifyContent: "flex-end" }}>
                    <Receipt size={11} /> {billNo}
                  </div>
                </div>
              </div>

              {/* Message Box */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.4rem"
                }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: "600", color: "#475569" }}>
                    Message to be Dispatched
                  </label>
                  <button 
                    onClick={handleCopy}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: copied ? "#16a34a" : "#64748b",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer"
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy Text"}
                  </button>
                </div>

                <div style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "var(--radius-md)",
                  padding: "0.9rem",
                  color: "#166534",
                  fontSize: "0.82rem",
                  lineHeight: "1.5",
                  whiteSpace: "pre-line",
                  fontFamily: "system-ui, -apple-system, sans-serif"
                }}>
                  {loading ? "Preparing message with UPI link..." : (data?.message || "")}
                </div>
              </div>

              {/* Primary Actions: Direct background dispatch */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  onClick={handleSendDirect}
                  disabled={loading || sendingDirect}
                  style={{
                    background: "#075E54",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    padding: "0.75rem 1.25rem",
                    fontWeight: "700",
                    fontSize: "0.92rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 12px rgba(7, 94, 84, 0.25)",
                    transition: "all 0.2s"
                  }}
                >
                  <Send size={16} />
                  {sendingDirect ? "Sending directly to phone..." : "Send Reminder Directly to Mobile"}
                </button>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  margin: "0.25rem 0"
                }}>
                  <div style={{ height: "1px", background: "#e2e8f0", flex: 1 }}></div>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>
                    Payment Simulation
                  </span>
                  <div style={{ height: "1px", background: "#e2e8f0", flex: 1 }}></div>
                </div>

                <button
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  style={{
                    background: "#f8fafc",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "var(--radius-md)",
                    padding: "0.65rem 1rem",
                    fontWeight: "600",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s"
                  }}
                >
                  <Zap size={14} color="#f59e0b" />
                  {simulating ? "Reconciling via Webhook..." : "Simulate Customer Paid via UPI Link (Live Test)"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
