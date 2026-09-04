import React from "react";
import { 
  IndianRupee, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert, 
  Zap, 
  ChevronRight,
  Activity,
  MessageCircle
} from "lucide-react";
import { sendBulkWhatsApp } from "../../services/api";

export default function RevenueHQ({ 
  metrics, 
  agingData, 
  onPromptAgent, 
  onNavigateTab,
  onShowToast,
  onRefreshData
}) {
  const formatINR = (val) => {
    if (val === undefined || val === null) return "₹0.00";
    return "₹" + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const buckets = agingData?.buckets || [];
  const totalAgingAmount = agingData?.total_delinquent_amount || 1;

  return (
    <div>
      {/* Top Banner with Clean Context */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "1.15rem 1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        boxShadow: "var(--shadow-xs)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{
            background: "var(--primary)",
            color: "#ffffff",
            borderRadius: "var(--radius-md)",
            padding: "0.55rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Zap size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" }}>
              Khushi Threads — Business Overview
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Total pending udhar is <strong style={{ color: "var(--danger-text)" }}>{formatINR(metrics?.total_outstanding)}</strong> across {metrics?.overdue_customers_count || 2} customer accounts.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={async () => {
              if (onShowToast) onShowToast("Sending automated WhatsApp reminders directly to customer phones...");
              try {
                const res = await sendBulkWhatsApp();
                if (onShowToast) onShowToast(`✅ Sent WhatsApp reminders directly to ${res.total_sent || 2} overdue customers!`);
                if (onRefreshData) onRefreshData();
              } catch (e) {
                if (onPromptAgent) onPromptAgent("Prepare WhatsApp payment reminders for overdue customers");
              }
            }}
            style={{ gap: "0.4rem" }}
          >
            <MessageCircle size={13} />
            Send WhatsApp Reminders
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Simple & Understandable */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Collected Amount</span>
            <div className="kpi-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--success)" }}>
            {formatINR(metrics?.realized_revenue)}
          </div>
          <div className="kpi-subtext">
            <CheckCircle2 size={13} color="var(--success)" />
            <span>{metrics?.paid_transactions_count || 0} bills settled</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Pending Udhar</span>
            <div className="kpi-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--warning)" }}>
            {formatINR(metrics?.total_outstanding)}
          </div>
          <div className="kpi-subtext">
            <AlertTriangle size={13} color="var(--warning)" />
            <span>{metrics?.overdue_customers_count || 0} accounts with pending dues</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Overdue &gt;7 Days</span>
            <div className="kpi-icon" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--danger)" }}>
            {formatINR(metrics?.revenue_at_risk)}
          </div>
          <div className="kpi-subtext">
            <span>Needs immediate reminder</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Collection Rate</span>
            <div className="kpi-icon" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {metrics?.collection_rate_percent || 0}%
          </div>
          <div className="kpi-subtext">
            <span>Overall recovery rate</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Aging Breakdown + Autonomous Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem" }}>
        
        {/* Aging Buckets Card */}
        <div className="table-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div>
              <h4 style={{ fontSize: "0.98rem", fontWeight: "700", color: "var(--text-main)" }}>Receivables Aging Analysis</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Breakdown of outstanding dues categorized by delinquency aging buckets
              </p>
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => onNavigateTab("customers")}
            >
              View Full Ledger
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {buckets.map((b, i) => {
              const pct = totalAgingAmount > 0 ? (b.amount / totalAgingAmount) * 100 : 0;
              const barColor = i === 0 ? "var(--success)" : (i === 1 ? "var(--warning)" : "var(--danger)");
              
              return (
                <div key={b.label} style={{
                  background: "var(--bg-surface-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.95rem 1.15rem",
                  border: "1px solid var(--border-subtle)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-main)" }}>{b.label}</span>
                    <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--text-main)" }}>
                      {formatINR(b.amount)} <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>({b.count} client{b.count !== 1 ? "s" : ""})</span>
                    </span>
                  </div>

                  <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden", marginBottom: "0.75rem" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: "9999px" }} />
                  </div>

                  {b.clients && b.clients.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
                      {b.clients.map(c => (
                        <div key={c.id} style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "0.78rem",
                          color: "var(--text-secondary)",
                          padding: "0.35rem 0",
                          borderTop: "1px solid var(--border-subtle)"
                        }}>
                          <span><strong>{c.name}</strong> ({c.company_name}) • <span style={{ color: "var(--danger-text)", fontWeight: "600" }}>{c.overdue_days}d overdue</span></span>
                          <span style={{ fontWeight: "700", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>{formatINR(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Autonomous Recommendations & Quick Actions */}
        <div className="table-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--text-main)" }}>
            <Activity size={16} color="var(--primary-brand)" />
            Recommended Actions
          </h4>

          {/* Action 1: Top debtor */}
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "var(--radius-md)",
            padding: "0.9rem 1.1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#991b1b", fontWeight: "700", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
              <ShieldAlert size={14} /> Highest Pending Account
            </div>
            <p style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "0.65rem", lineHeight: "1.4" }}>
              <strong style={{ color: "#0f172a" }}>Anshu Patel</strong> has ₹35,921.00 pending across 49 bills.
            </p>
            <button 
              className="btn btn-primary btn-sm"
              style={{ width: "100%", gap: "0.35rem" }}
              onClick={() => onPromptAgent("Prepare WhatsApp payment reminders for Anshu Patel")}
            >
              <MessageCircle size={13} />
              Send WhatsApp to Anshu Patel
            </button>
          </div>

          {/* Action 2: Multi-client */}
          <div style={{
            background: "#f8fafc",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.9rem 1.1rem"
          }}>
            <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--text-main)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <MessageCircle size={14} color="#16a34a" /> Remind All Overdue Accounts
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.65rem", lineHeight: "1.4" }}>
              Generate 1-click UPI links for all {metrics?.overdue_customers_count || 2} accounts with pending balance.
            </p>
            <button 
              className="btn btn-outline btn-sm"
              style={{ width: "100%" }}
              onClick={() => onPromptAgent("Prepare WhatsApp payment reminders for overdue customers")}
            >
              Send Reminders to Everyone
            </button>
          </div>

          {/* Action 3: Importer shortcut */}
          <div style={{
            background: "#f8fafc",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.9rem 1.1rem"
          }}>
            <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--text-main)", marginBottom: "0.25rem" }}>
              📁 Import New Invoices
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.65rem", lineHeight: "1.4" }}>
              Upload any CSV, Excel spreadsheet, or PDF from your billing software.
            </p>
            <button 
              className="btn btn-outline btn-sm"
              style={{ width: "100%" }}
              onClick={() => onNavigateTab("integrations")}
            >
              Open File Importer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
