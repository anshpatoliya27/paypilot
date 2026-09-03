import React, { useState } from "react";
import { 
  Users, 
  Search, 
  Bot, 
  Clock, 
  X, 
  Phone, 
  Mail, 
  Building,
  CreditCard
} from "lucide-react";
import { fetchCustomerDetail } from "../../services/api";

export default function CustomerLedger({ 
  customers, 
  onPromptAgent 
}) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const formatINR = (val) => {
    return "₹" + Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  };

  const handleOpenDetail = async (c) => {
    setSelectedCustomer(c);
    setLoadingDetail(true);
    try {
      const res = await fetchCustomerDetail(c.id);
      setCustomerDetail(res);
    } catch (e) {
      console.error("Failed to load customer details:", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = (customers || []).filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.company_name && c.company_name.toLowerCase().includes(search.toLowerCase())) ||
                        c.email.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === "ALL" || c.risk_category === riskFilter;
    return matchSearch && matchRisk;
  });

  return (
    <div>
      <div className="table-card">
        {/* Table Header & Controls */}
        <div className="table-header-box">
          <div className="table-title">
            <Users size={18} color="var(--primary)" />
            Customer Receivables & Risk Intelligence
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-muted)" }} />
              <input 
                type="text"
                placeholder="Search customer, company, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.45rem 0.85rem 0.45rem 2rem",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  outline: "none",
                  width: "240px"
                }}
              />
            </div>

            <select 
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{
                background: "#ffffff",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "0.45rem 0.85rem",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="ALL">All Risk Profiles</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer & Company</th>
              <th>Contact Details</th>
              <th>Outstanding Balance</th>
              <th>Aging Status</th>
              <th>Risk Profile</th>
              <th>Lifetime Value</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: "700", color: "var(--text-main)" }}>{c.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Building size={11} />
                    {c.company_name || "Independent"}
                  </div>
                </td>

                <td>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Mail size={11} color="var(--text-muted)" />
                    {c.email}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "2px" }}>
                    <Phone size={11} color="var(--text-muted)" />
                    {c.phone}
                  </div>
                </td>

                <td>
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: "700",
                    fontSize: "0.92rem",
                    color: c.outstanding_balance > 0 ? "var(--warning-text)" : "var(--success-text)"
                  }}>
                    {formatINR(c.outstanding_balance)}
                  </div>
                </td>

                <td>
                  {c.outstanding_balance > 0 ? (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.78rem",
                      fontWeight: "600",
                      color: c.overdue_days >= 8 ? "var(--danger-text)" : "var(--warning-text)"
                    }}>
                      <Clock size={12} /> {c.overdue_days} days overdue
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "500" }}>All Dues Settled</span>
                  )}
                </td>

                <td>
                  <span className={`badge badge-${c.risk_category.toLowerCase()}`}>
                    {c.risk_category} RISK
                  </span>
                  {c.failed_payment_count > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--danger-text)", fontWeight: "600", marginTop: "0.2rem" }}>
                      ⚠️ {c.failed_payment_count} failed attempt(s)
                    </div>
                  )}
                </td>

                <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-main)", fontWeight: "600" }}>
                  {formatINR(c.lifetime_value)}
                </td>

                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.45rem" }}>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenDetail(c)}
                    >
                      History
                    </button>
                    {c.outstanding_balance > 0 && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => onPromptAgent(`Prepare reminders for ${c.name}`)}
                      >
                        <Bot size={13} />
                        Recover
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="modal-backdrop" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedCustomer.name}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {selectedCustomer.company_name || "Independent"} • {selectedCustomer.email}
                </span>
              </div>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedCustomer(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ background: "var(--bg-surface-subtle)", border: "1px solid var(--border-subtle)", padding: "0.95rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.04em" }}>Outstanding Dues</div>
                <div style={{ fontSize: "1.35rem", fontWeight: "700", fontFamily: "var(--font-mono)", color: selectedCustomer.outstanding_balance > 0 ? "var(--warning-text)" : "var(--success-text)", marginTop: "2px" }}>
                  {formatINR(selectedCustomer.outstanding_balance)}
                </div>
              </div>

              <div style={{ background: "var(--bg-surface-subtle)", border: "1px solid var(--border-subtle)", padding: "0.95rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.04em" }}>Lifetime Revenue</div>
                <div style={{ fontSize: "1.35rem", fontWeight: "700", fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "2px" }}>
                  {formatINR(selectedCustomer.lifetime_value)}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CreditCard size={15} color="var(--primary-brand)" />
              Recent Razorpay Transactions
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "220px", overflowY: "auto" }}>
              {customerDetail?.payments && customerDetail.payments.length > 0 ? (
                customerDetail.payments.map(p => (
                  <div key={p.id} style={{
                    background: "var(--bg-surface-subtle)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.65rem 0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-main)" }}>{p.description}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{p.rzp_payment_link_id || p.id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "700", fontFamily: "var(--font-mono)", color: "var(--text-main)", fontSize: "0.88rem" }}>{formatINR(p.amount)}</div>
                      <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  {loadingDetail ? "Loading transaction history..." : "No past transaction history found."}
                </div>
              )}
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "0.65rem" }}>
              <button 
                className="btn btn-outline"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  const name = selectedCustomer.name;
                  setSelectedCustomer(null);
                  onPromptAgent(`Audit customer ${name} and prepare recovery`);
                }}
              >
                <Bot size={14} /> Audit With PayPilot Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
