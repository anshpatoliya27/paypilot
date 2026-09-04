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
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet
} from "lucide-react";
import { fetchKhushiStatus } from "../../services/api";

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  pendingApprovalsCount = 0, 
  onResetDemo,
  onSyncKhushi,
  isSyncingKhushi = false,
  onOpenModal,
  onOpenWebhookSimulator 
}) {
  const [khushiStatus, setKhushiStatus] = useState({ online: true, active_customers: 2, total_orders: 54 });

  useEffect(() => {
    fetchKhushiStatus()
      .then(data => {
        if (data) setKhushiStatus(data);
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
              gap: "5px",
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
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
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
          KT
        </div>
      </div>
    </header>
  );
}
