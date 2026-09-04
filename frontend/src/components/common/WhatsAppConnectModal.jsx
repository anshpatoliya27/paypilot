import React, { useState, useEffect } from "react";
import { 
  X, 
  MessageCircle, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Send 
} from "lucide-react";
import { fetchWhatsAppStatus, connectWhatsAppDevice, disconnectWhatsAppDevice, sendDirectWhatsApp } from "../../services/api";

export default function WhatsAppConnectModal({ onClose, onStatusChange }) {
  const [status, setStatus] = useState({ connected: true, phone: "+91 90169 29244", device_name: "Khushi Threads Mobile (Linked)" });
  const [loading, setLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    fetchWhatsAppStatus()
      .then(res => setStatus(res))
      .catch(() => {});
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await connectWhatsAppDevice("+91 90169 29244");
      setStatus(res);
      if (onStatusChange) onStatusChange(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const res = await disconnectWhatsAppDevice();
      setStatus(res);
      if (onStatusChange) onStatusChange(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    try {
      await sendDirectWhatsApp({
        customer_name: "Anshu Patel",
        phone: "+919825100000",
        amount_rupees: 35921.00,
        bill_no: "INV-KT-DEMO"
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1200,
      padding: "1rem"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "var(--radius-xl)",
        width: "100%",
        maxWidth: "460px",
        boxShadow: "var(--shadow-xl)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: "#075E54",
          color: "#ffffff",
          padding: "1.15rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MessageCircle size={20} />
            <span style={{ fontWeight: "700", fontSize: "1rem" }}>WhatsApp Web Device</span>
          </div>
          <button 
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer", opacity: 0.8 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {status?.connected ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.75rem"
              }}>
                <CheckCircle2 size={32} />
              </div>

              <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                WhatsApp Connected
              </h4>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748b" }}>
                Linked to <strong>{status.phone || "+91 90169 29244"}</strong>
              </p>

              <div style={{
                margin: "1.25rem 0",
                padding: "0.85rem",
                background: "#f8fafc",
                borderRadius: "var(--radius-md)",
                border: "1px solid #e2e8f0",
                fontSize: "0.8rem",
                color: "#475569",
                lineHeight: "1.5",
                textAlign: "left"
              }}>
                ✅ When you click <strong>Send Reminder</strong> on any bill or in the AI chat, the message is delivered <strong>automatically in the background</strong> without opening WhatsApp.
              </div>

              {testSent && (
                <div style={{
                  padding: "0.65rem",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "6px",
                  color: "#065f46",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  marginBottom: "1rem"
                }}>
                  ✅ Direct WhatsApp message sent to +91 98251 00000!
                </div>
              )}

              <div style={{ display: "flex", gap: "0.65rem" }}>
                <button
                  className="btn btn-outline"
                  onClick={handleSendTest}
                  style={{ flex: 1, fontSize: "0.8rem", gap: "0.35rem" }}
                >
                  <Send size={13} />
                  Send Test Message
                </button>
                <button
                  className="btn btn-outline"
                  onClick={handleDisconnect}
                  disabled={loading}
                  style={{ color: "#dc2626", borderColor: "#fecaca", fontSize: "0.8rem", gap: "0.35rem" }}
                >
                  <LogOut size={13} />
                  Unlink
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", fontWeight: "700", color: "#0f172a" }}>
                Link Mobile WhatsApp
              </h4>
              <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#64748b" }}>
                Scan this QR code from your phone's WhatsApp to send automated reminders.
              </p>

              {/* Realistic SVG QR Code Display */}
              <div style={{
                background: "#ffffff",
                border: "2px solid #e2e8f0",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                display: "inline-block",
                marginBottom: "1rem",
                boxShadow: "var(--shadow-sm)"
              }}>
                <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="180" height="180" fill="white"/>
                  {/* Outer corner boxes */}
                  <rect x="15" y="15" width="45" height="45" rx="6" fill="#0f172a"/>
                  <rect x="23" y="23" width="29" height="29" rx="3" fill="white"/>
                  <rect x="29" y="29" width="17" height="17" rx="2" fill="#075E54"/>

                  <rect x="120" y="15" width="45" height="45" rx="6" fill="#0f172a"/>
                  <rect x="128" y="23" width="29" height="29" rx="3" fill="white"/>
                  <rect x="134" y="29" width="17" height="17" rx="2" fill="#075E54"/>

                  <rect x="15" y="120" width="45" height="45" rx="6" fill="#0f172a"/>
                  <rect x="23" y="128" width="29" height="29" rx="3" fill="white"/>
                  <rect x="29" y="134" width="17" height="17" rx="2" fill="#075E54"/>

                  {/* QR Data Pattern */}
                  <rect x="75" y="20" width="12" height="12" fill="#0f172a"/>
                  <rect x="95" y="25" width="10" height="10" fill="#0f172a"/>
                  <rect x="80" y="45" width="25" height="10" fill="#0f172a"/>
                  <rect x="70" y="70" width="40" height="40" rx="4" fill="#25D366"/>
                  <circle cx="90" cy="90" r="10" fill="white"/>
                  <rect x="20" y="75" width="15" height="15" fill="#0f172a"/>
                  <rect x="45" y="80" width="15" height="25" fill="#0f172a"/>
                  <rect x="125" y="75" width="35" height="12" fill="#0f172a"/>
                  <rect x="140" y="95" width="20" height="15" fill="#0f172a"/>
                  <rect x="75" y="125" width="15" height="35" fill="#0f172a"/>
                  <rect x="100" y="130" width="25" height="15" fill="#0f172a"/>
                  <rect x="135" y="125" width="30" height="40" fill="#0f172a"/>
                </svg>
              </div>

              <div style={{
                textAlign: "left",
                fontSize: "0.78rem",
                color: "#475569",
                background: "#f8fafc",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                lineHeight: "1.4",
                marginBottom: "1rem"
              }}>
                1. Open WhatsApp on your phone<br/>
                2. Go to <strong>Settings &gt; Linked Devices</strong><br/>
                3. Tap <strong>Link a Device</strong> and point phone at this QR
              </div>

              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={loading}
                style={{ width: "100%", background: "#25D366", color: "#ffffff", border: "none", fontWeight: "700" }}
              >
                {loading ? "Connecting..." : "Simulate QR Scan (Connect Mobile)"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
