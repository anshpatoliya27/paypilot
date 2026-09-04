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
  ExternalLink
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
      {/* Brand & Workspace Status */}
      <div className="brand-section">
        <div className="logo-badge">
          <Zap size={20} />
        </div>
        <div>
          <div className="brand-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>PayPilot</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: "400" }}>×</span>
            <a 
              href="https://khushi-threads.vercel.app/" 
              target="_blank" 
              rel="noreferrer"
              style={{ color: "#0f172a", textDecoration: "none", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "3px" }}
              title="Open Khushi Threads Live Site"
            >
              Khushi Threads
              <ExternalLink size={10} style={{ color: "var(--text-muted)" }} />
            </a>
            <span className="brand-tag">Real Data Active</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "-2px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: "600", color: "#1e293b" }}>Textile Billing OS</span>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#059669" }}></span>
            <span style={{ color: "#059669", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
              Live Sync: 54 Bills
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <nav className="nav-links">
        <button 
          className={`nav-tab ${activeTab === "agent" ? "active" : ""}`}
          onClick={() => setActiveTab("agent")}
        >
          <Bot size={15} />
          Agent Copilot
        </button>

        <button 
          className={`nav-tab ${activeTab === "revenue" ? "active" : ""}`}
          onClick={() => setActiveTab("revenue")}
        >
          <LayoutDashboard size={15} />
          Revenue HQ
        </button>

        <button 
          className={`nav-tab ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          <Users size={15} />
          Receivables & Bills
        </button>

        <button 
          className={`nav-tab ${activeTab === "links" ? "active" : ""}`}
          onClick={() => setActiveTab("links")}
        >
          <LinkIcon size={15} />
          Payment Links
        </button>

        <button 
          className={`nav-tab ${activeTab === "approvals" ? "active" : ""}`}
          onClick={() => setActiveTab("approvals")}
        >
          <ShieldCheck size={15} />
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
          <History size={15} />
          Audit Trail
        </button>
      </nav>

      {/* Top Header Actions */}
      <div className="nav-actions">
        {/* Khushi Live Sync Button */}
        <button 
          className="btn btn-outline btn-sm"
          onClick={onSyncKhushi}
          disabled={isSyncingKhushi}
          title="Pull live bills, customers, and payments directly from Khushi Threads backend"
          style={{ 
            borderColor: "#cbd5e1", 
            background: isSyncingKhushi ? "#f1f5f9" : "#ffffff",
            fontWeight: "600",
            color: "#0f172a"
          }}
        >
          <RefreshCw size={13} style={{ animation: isSyncingKhushi ? "spin 1s linear infinite" : "none" }} />
          {isSyncingKhushi ? "Syncing..." : "Sync Khushi Data"}
        </button>

        <button 
          className="btn btn-primary btn-sm"
          onClick={handleOpenWebhook}
          title="Simulate incoming Razorpay payment webhook capture"
        >
          <Zap size={13} />
          Simulate Webhook
        </button>

        {/* Merchant Avatar Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", paddingLeft: "0.5rem", borderLeft: "1px solid var(--border-subtle)" }}>
          <div 
            style={{ 
              width: "32px", 
              height: "32px", 
              borderRadius: "50%", 
              background: "linear-gradient(135deg, #0f172a, #334155)", 
              color: "#ffffff", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: "0.75rem", 
              fontWeight: "700" 
            }}
            title="Khushi Threads (Ansh Patoliya)"
          >
            KT
          </div>
        </div>
      </div>
    </header>
  );
}
