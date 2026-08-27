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
  ExternalLink 
} from "lucide-react";

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  pendingApprovalsCount = 0, 
  onResetDemo, 
  onOpenWebhookSimulator 
}) {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="logo-badge">
          <Zap size={20} />
        </div>
        <div>
          <div className="brand-title">
            PayPilot
            <span className="brand-tag">Razorpay AI</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "-2px" }}>
            Autonomous Revenue Operations • Apex Studios
          </div>
        </div>
      </div>

      <nav className="nav-links">
        <button 
          className={`nav-tab ${activeTab === "agent" ? "active" : ""}`}
          onClick={() => setActiveTab("agent")}
        >
          <Bot size={16} />
          Agent Command
        </button>

        <button 
          className={`nav-tab ${activeTab === "revenue" ? "active" : ""}`}
          onClick={() => setActiveTab("revenue")}
        >
          <LayoutDashboard size={16} />
          Revenue HQ
        </button>

        <button 
          className={`nav-tab ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          <Users size={16} />
          Receivables
        </button>

        <button 
          className={`nav-tab ${activeTab === "links" ? "active" : ""}`}
          onClick={() => setActiveTab("links")}
        >
          <LinkIcon size={16} />
          Payment Links
        </button>

        <button 
          className={`nav-tab ${activeTab === "approvals" ? "active" : ""}`}
          onClick={() => setActiveTab("approvals")}
        >
          <ShieldCheck size={16} />
          Approvals
          {pendingApprovalsCount > 0 && (
            <span className="nav-badge" style={{ background: "var(--warning)", color: "#000" }}>
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button 
          className={`nav-tab ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <History size={16} />
          Audit Trail
        </button>
      </nav>

      <div className="nav-actions">
        <button 
          className="btn btn-outline btn-sm"
          onClick={onResetDemo}
          title="Reset business state to ₹75.5k overdue demo scenario"
        >
          <RotateCcw size={14} />
          Reset Demo
        </button>

        <button 
          className="btn btn-rzp btn-sm"
          onClick={onOpenWebhookSimulator}
          title="Simulate incoming Razorpay payment webhook capture"
        >
          <Zap size={14} color="#3395ff" />
          Simulate Webhook
        </button>
      </div>
    </header>
  );
}
