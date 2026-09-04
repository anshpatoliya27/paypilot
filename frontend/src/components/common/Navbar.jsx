import React, { useState, useEffect } from "react";
import { 
  Bot, 
  LayoutDashboard, 
  Users, 
  Link as LinkIcon, 
  ShieldCheck, 
  History, 
  RotateCcw, 
  Zap,
  RefreshCw,
  MessageCircle,
  FileSpreadsheet,
  QrCode
} from "lucide-react";
import { fetchKhushiStatus, fetchWhatsAppStatus } from "../../services/api";

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  pendingApprovalsCount = 0, 
  onResetDemo,
  onSyncKhushi,
  isSyncingKhushi = false,
  onOpenModal,
  onOpenWebhookSimulator,
  onOpenWhatsAppConnect
}) {
  const [khushiStatus, setKhushiStatus] = useState({ online: true, active_customers: 2, total_orders: 54 });
  const [waStatus, setWaStatus] = useState({ connected: true, phone: "+91 90169 29244" });

  useEffect(() => {
    fetchKhushiStatus()
      .then(data => {
        if (data) setKhushiStatus(data);
      })
      .catch(() => {});

    fetchWhatsAppStatus()
      .then(data => {
        if (data) setWaStatus(data);
      })
      .catch(() => {});
  }, []);

  const handleOpenWebhook = () => {
    if (onOpenModal) onOpenModal();
    else if (onOpenWebhookSimulator) onOpenWebhookSimulator();
  };

  return (
    <header className="navbar">
      {/* Brand */}
      <div className="brand-section">
        <div className="logo-badge" style={{ width: "32px", height: "32px", borderRadius: "8px" }}>
          <Zap size={17} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: "800", fontSize: "1.05rem", color: "#0f172a", letterSpacing: "-0.02em" }}>
            PayPilot
          </span>
          <a 
            href="https://khushi-threads.vercel.app/" 
            target="_blank" 
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "0.72rem",
              fontWeight: "600",
              color: "#334155",
              textDecoration: "none"
            }}
            title="Khushi Threads Live Store"
          >
            Khushi Threads
          </a>
        </div>
      </div>

      {/* Navigation Tabs - Simple & Understandable */}
      <nav className="nav-links">
        <button 
          className={`nav-tab ${activeTab === "revenue" ? "active" : ""}`}
          onClick={() => setActiveTab("revenue")}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>

        <button 
          className={`nav-tab ${activeTab === "agent" ? "active" : ""}`}
          onClick={() => setActiveTab("agent")}
        >
          <Bot size={14} />
          AI Assistant
        </button>

        <button 
          className={`nav-tab ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          <Users size={14} />
          Customers & Bills
        </button>

        <button 
          className={`nav-tab ${activeTab === "links" ? "active" : ""}`}
          onClick={() => setActiveTab("links")}
        >
          <LinkIcon size={14} />
          Payment Links
        </button>

        <button 
          className={`nav-tab ${activeTab === "integrations" ? "active" : ""}`}
          onClick={() => setActiveTab("integrations")}
        >
          <FileSpreadsheet size={14} />
          Import & API
        </button>

        <button 
          className={`nav-tab ${activeTab === "approvals" ? "active" : ""}`}
          onClick={() => setActiveTab("approvals")}
        >
          <ShieldCheck size={14} />
          Approvals
          {pendingApprovalsCount > 0 && (
            <span className="nav-badge">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button 
          className={`nav-tab ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <History size={14} />
          Audit
        </button>
      </nav>

      {/* Header Actions */}
      <div className="nav-actions">
        {/* WhatsApp Mobile Connection QR Trigger */}
        <button 
          className="btn btn-outline btn-sm"
          onClick={onOpenWhatsAppConnect}
          title="Scan QR to connect mobile WhatsApp for automated background reminders"
          style={{ 
            fontSize: "0.78rem", 
            padding: "0.4rem 0.75rem",
            color: waStatus.connected ? "#15803d" : "#475569",
            borderColor: waStatus.connected ? "#bbf7d0" : "#e2e8f0",
            background: waStatus.connected ? "#f0fdf4" : "#ffffff"
          }}
        >
          <MessageCircle size={13} color={waStatus.connected ? "#16a34a" : "#64748b"} />
          <span>{waStatus.connected ? "WhatsApp Linked" : "Connect WhatsApp"}</span>
        </button>

        <button 
          className="btn btn-outline btn-sm"
          onClick={onSyncKhushi}
          disabled={isSyncingKhushi}
          title="Pull live bills and payments from Khushi Threads"
          style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}
        >
          <RefreshCw size={12} style={{ animation: isSyncingKhushi ? "spin 1s linear infinite" : "none" }} />
          {isSyncingKhushi ? "Syncing..." : "Sync Data"}
        </button>

        <button 
          className="btn btn-primary btn-sm"
          onClick={handleOpenWebhook}
          title="Simulate customer payment received"
          style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}
        >
          <Zap size={12} />
          Simulate Payment
        </button>

        {/* Merchant Avatar */}
        <div 
          style={{ 
            width: "30px", 
            height: "30px", 
            borderRadius: "50%", 
            background: "#0f172a", 
            color: "#ffffff", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "0.72rem", 
            fontWeight: "700" 
          }}
          title="Khushi Threads (Ansh Patoliya)"
        >
          AP
        </div>
      </div>
    </header>
  );
}
