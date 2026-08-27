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
  ChevronRight 
} from "lucide-react";

export default function RevenueHQ({ 
  metrics, 
  agingData, 
  onPromptAgent, 
  onNavigateTab 
}) {
  const formatINR = (val) => {
    if (val === undefined || val === null) return "₹0.00";
    return "₹" + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const buckets = agingData?.buckets || [];
  const totalAgingAmount = agingData?.total_delinquent_amount || 1;

  return (
    <div>
      {/* Top Banner with Quick Context */}
      <div style={{
        background: "linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(12, 35, 64, 0.4))",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{
            background: "var(--primary)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            padding: "0.6rem",
            display: "flex"
          }}>
            <Zap size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
              PayPilot Autonomous Revenue Operations Active
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Monitoring 5 customer accounts on official Razorpay rails. Identified ₹75,500 overdue balance requiring attention.
            </p>
          </div>
        </div>

        <button 
          className="btn btn-primary btn-sm"
          onClick={() => onPromptAgent("Who owes me money and what is pending?")}
        >
          Run Full Receivables Audit <ArrowRight size={14} />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Realized Revenue</span>
            <div className="kpi-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--success)" }}>
            {formatINR(metrics?.realized_revenue)}
          </div>
          <div className="kpi-subtext">
            <CheckCircle2 size={13} color="var(--success)" />
            <span>{metrics?.paid_transactions_count || 0} reconciled payments settled</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Outstanding</span>
            <div className="kpi-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--warning)" }}>
            {formatINR(metrics?.total_outstanding)}
          </div>
          <div className="kpi-subtext">
            <AlertTriangle size={13} color="var(--warning)" />
            <span>{metrics?.overdue_customers_count || 0} clients with active overdue dues</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Revenue At Risk</span>
            <div className="kpi-icon" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--danger)" }}>
            {formatINR(metrics?.revenue_at_risk)}
          </div>
          <div className="kpi-subtext">
            <span>High delinquency (&gt;7 days or failed payment)</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Collection Velocity</span>
            <div className="kpi-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {metrics?.collection_rate_percent || 0}%
          </div>
          <div className="kpi-subtext">
            <span>{metrics?.failed_payments_count || 0} failed attempt(s) diagnosed</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Aging Breakdown + Autonomous Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem" }}>
        
        {/* Aging Buckets Card */}
        <div className="table-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div>
              <h4 style={{ fontSize: "1rem", fontWeight: "700" }}>Receivables Aging Analysis</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Breakdown of outstanding dues categorized by aging days
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
                  background: "var(--bg-surface-raised)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.85rem 1rem",
                  border: "1px solid var(--border-subtle)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{b.label}</span>
                    <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", fontWeight: "700" }}>
                      {formatINR(b.amount)} ({b.count} client{b.count !== 1 ? "s" : ""})
                    </span>
                  </div>

                  <div style={{ height: "6px", background: "var(--bg-main)", borderRadius: "9999px", overflow: "hidden", marginBottom: "0.65rem" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: "9999px" }} />
                  </div>

                  {b.clients && b.clients.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.5rem" }}>
                      {b.clients.map(c => (
                        <div key={c.id} style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "0.78rem",
                          color: "var(--text-secondary)",
                          padding: "0.25rem 0",
                          borderTop: "1px solid rgba(255,255,255,0.04)"
                        }}>
                          <span>{c.name} ({c.company_name}) • {c.overdue_days}d overdue</span>
                          <span style={{ fontWeight: "600", color: "#fff" }}>{formatINR(c.amount)}</span>
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
        <div className="table-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Zap size={16} color="var(--primary)" />
            Agent Recommendations
          </h4>

          <div style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#f87171", fontWeight: "700", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
              <ShieldAlert size={14} /> High Risk Delinquency Alert
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>
              <strong>ABC Enterprises Ltd</strong> has ₹42,000 overdue by 9 days with 2 failed payment attempts.
            </p>
            <button 
              className="btn btn-primary btn-sm"
              style={{ width: "100%" }}
              onClick={() => onPromptAgent("Prepare reminders for ABC Ltd")}
            >
              Draft Recovery for ABC Ltd <ChevronRight size={14} />
            </button>
          </div>

          <div style={{
            background: "var(--bg-surface-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem"
          }}>
            <div style={{ fontWeight: "700", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
              ⚡ 1-Click Multi-Client Campaign
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>
              Stage dynamic Razorpay payment links for all 3 overdue clients (₹75,500 total).
            </p>
            <button 
              className="btn btn-outline btn-sm"
              style={{ width: "100%" }}
              onClick={() => onPromptAgent("Prepare reminders for everyone overdue")}
            >
              Prepare Bulk Recovery Campaign
            </button>
          </div>

          <div style={{
            background: "var(--bg-surface-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem"
          }}>
            <div style={{ fontWeight: "700", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
              🔍 Failed Payment Diagnostics
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>
              Inspect bank timeout error codes and prepare re-engagement links.
            </p>
            <button 
              className="btn btn-outline btn-sm"
              style={{ width: "100%" }}
              onClick={() => onPromptAgent("Show me failed payments from this week")}
            >
              Diagnose Failed Payments
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
