import React, { useState, useEffect } from "react";
import { 
  X, 
  MessageCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Receipt
} from "lucide-react";
import { generateWhatsAppLink, simulateInstantPayment } from "../../services/api";

export default function WhatsAppModal({ 
  customer, 
  billNo = "INV-PENDING", 
  amountRupees = 0, 
  paymentUrl = null, 
  onClose, 
  onPaymentSuccess 
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
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

  const handleOpenWhatsApp = () => {
    if (data?.whatsapp_url) {
      window.open(data.whatsapp_url, "_blank", "noopener,noreferrer");
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
        overflow: "hidden",
        animation: "slideIn 0.2s ease-out"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #128C7E, #075E54)",
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
                1-Click WhatsApp Payment Link
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.76rem", opacity: 0.85 }}>
                Direct WhatsApp UPI Dispatch with Razorpay Reconcile
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
              opacity: 0.8,
              transition: "opacity 0.2s"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: "1.5rem" }}>
          {simSuccess ? (
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
                Payment Received & Reconciled! 🟢
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
                    WhatsApp Message Preview
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
                  background: "#e7f5e8",
                  border: "1px solid #c6e7c8",
                  borderRadius: "var(--radius-md)",
                  padding: "0.9rem",
                  color: "#1e3a1f",
                  fontSize: "0.82rem",
                  lineHeight: "1.5",
                  whiteSpace: "pre-line",
                  fontFamily: "system-ui, -apple-system, sans-serif"
                }}>
                  {loading ? "Generating UPI payment link..." : (data?.message || "")}
                </div>
              </div>

              {/* Primary Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  onClick={handleOpenWhatsApp}
                  disabled={loading}
                  style={{
                    background: "#25D366",
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
                    boxShadow: "0 4px 12px rgba(37, 211, 102, 0.35)",
                    transition: "all 0.2s"
                  }}
                >
                  <MessageCircle size={18} />
                  Open in WhatsApp (Direct Click-to-Chat)
                  <ExternalLink size={14} />
                </button>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  margin: "0.25rem 0"
                }}>
                  <div style={{ height: "1px", background: "#e2e8f0", flex: 1 }}></div>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>
                    Demonstration & Testing
                  </span>
                  <div style={{ height: "1px", background: "#e2e8f0", flex: 1 }}></div>
                </div>

                <button
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  style={{
                    background: "#f1f5f9",
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
