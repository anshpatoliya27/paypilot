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
  Activity
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
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem 1.75rem",
        marginBottom: "1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        boxShadow: "var(--shadow-xs)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            background: "var(--primary)",
            color: "#ffffff",
            borderRadius: "var(--radius-md)",
            padding: "0.65rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Zap size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-main)" }}>
              Khushi Threads Revenue Operations Active
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Continuous ledger monitoring on Razorpay rails. Identified <strong style={{ color: "var(--danger-text)" }}>{formatINR(metrics?.total_outstanding)} overdue receivables</strong> across {metrics?.overdue_customers_count || 2} customer accounts.
            </p>
          </div>
        </div>

        <button 
          className="btn btn-primary btn-sm"
          onClick={() => onPromptAgent("Who owes me money and what is pending?")}
        >
          Run Full Receivables Audit <ArrowRight size={13} />
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
            <div className="kpi-icon" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
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
          <h4 style={{ fontSize: "0.98rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--text-main)" }}>
            <Activity size={16} color="var(--primary-brand)" />
            Agent Recommendations
          </h4>

          {/* Alert 1 */}
          <div style={{
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            borderRadius: "var(--radius-md)",
            padding: "0.95rem 1.15rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--danger-text)", fontWeight: "700", fontSize: "0.82rem", marginBottom: "0.3rem" }}>
              <ShieldAlert size={14} /> Highest Outstanding Balance Alert
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: "1.45" }}>
              <strong style={{ color: "var(--text-main)" }}>Anshu Patel</strong> has ₹35,921.00 overdue across 49 pending textile invoices.
            </p>
            <button 
              className="btn btn-primary btn-sm"
              style={{ width: "100%" }}
              onClick={() => onPromptAgent("Prepare reminders for Anshu Patel")}
            >
              Draft Recovery for Anshu Patel <ChevronRight size={13} />
            </button>
          </div>

          {/* Recommendation 2 */}
          <div style={{
            background: "var(--bg-surface-subtle)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.95rem 1.15rem"
          }}>
            <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--text-main)", marginBottom: "0.3rem" }}>
              ⚡ 1-Click Multi-Client Campaign
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: "1.45" }}>
              Stage dynamic Razorpay payment links for all overdue accounts ({formatINR(metrics?.total_outstanding)} total).
            </p>
            <button 
              className="btn btn-outline btn-sm"
              style={{ width: "100%" }}
              onClick={() => onPromptAgent("Prepare reminders for everyone overdue")}
            >
              Prepare Bulk Recovery Campaign
            </button>
          </div>

          {/* Recommendation 3 */}
          <div style={{
            background: "var(--bg-surface-subtle)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.95rem 1.15rem"
          }}>
            <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--text-main)", marginBottom: "0.3rem" }}>
              🔍 Failed Payment Diagnostics
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: "1.45" }}>
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
