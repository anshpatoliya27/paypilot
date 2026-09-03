import React from "react";
import { 
  Bot, 
  LayoutDashboard, 
  Users, 
  Link as LinkIcon, 
  ShieldCheck, 
  History, 
  RotateCcw, 
  Zap,
  CheckCircle2
} from "lucide-react";

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  pendingApprovalsCount = 0, 
  onResetDemo, 
  onOpenModal,
  onOpenWebhookSimulator 
}) {
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
          <div className="brand-title">
            PayPilot
            <span className="brand-tag">Razorpay Rails</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "-2px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: "600", color: "#334155" }}>Apex Studios</span>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#059669" }}></span>
            <span style={{ color: "#059669", fontWeight: "600" }}>Neon PostgreSQL</span>
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
          Receivables
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
        <button 
          className="btn btn-outline btn-sm"
          onClick={onResetDemo}
          title="Reset business state to default overdue scenario"
        >
          <RotateCcw size={13} />
          Reset Demo
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
          <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700" }}>
            RP
          </div>
        </div>
      </div>
    </header>
  );
}
