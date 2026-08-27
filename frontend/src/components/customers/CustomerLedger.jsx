import React, { useState } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  ExternalLink, 
  Bot, 
  ShieldAlert, 
  Clock, 
  IndianRupee, 
  X, 
  Phone, 
  Mail, 
  Building 
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
                placeholder="Search customers or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.45rem 0.85rem 0.45rem 2rem",
                  color: "#fff",
                  fontSize: "0.82rem",
                  outline: "none"
                }}
              />
            </div>

            <select 
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{
                background: "var(--bg-main)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: "0.45rem 0.85rem",
                color: "#fff",
                fontSize: "0.82rem",
                outline: "none"
              }}
            >
              <option value="ALL">All Risk Categories</option>
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
              <th>Contact Info</th>
              <th>Outstanding Balance</th>
              <th>Overdue Aging</th>
              <th>Risk Profile</th>
              <th>Lifetime Value</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: "700", color: "#fff" }}>{c.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.company_name || "Independent"}</div>
                </td>

                <td>
                  <div style={{ fontSize: "0.78rem" }}>{c.email}</div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{c.phone}</div>
                </td>

                <td>
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: "700",
                    fontSize: "0.92rem",
                    color: c.outstanding_balance > 0 ? "var(--warning)" : "var(--success)"
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
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: c.overdue_days >= 8 ? "var(--danger)" : "var(--warning)"
                    }}>
                      <Clock size={12} /> {c.overdue_days} days overdue
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>All Dues Cleared</span>
                  )}
                </td>

                <td>
                  <span className={`badge badge-${c.risk_category.toLowerCase()}`}>
                    {c.risk_category} RISK
                  </span>
                  {c.failed_payment_count > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--danger)", marginTop: "0.2rem" }}>
                      ⚠️ {c.failed_payment_count} failed payment(s)
                    </div>
                  )}
                </td>

                <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
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

      {/* Customer Detail Slide-out Modal */}
      {selectedCustomer && (
        <div className="modal-backdrop" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedCustomer.name}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {selectedCustomer.company_name}
                </span>
              </div>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedCustomer(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "1.25rem" }}>
              <div style={{ background: "var(--bg-surface-raised)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Outstanding Due</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "700", color: selectedCustomer.outstanding_balance > 0 ? "var(--warning)" : "var(--success)" }}>
                  {formatINR(selectedCustomer.outstanding_balance)}
                </div>
              </div>

              <div style={{ background: "var(--bg-surface-raised)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Lifetime Value</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#fff" }}>
                  {formatINR(selectedCustomer.lifetime_value)}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: "0.88rem", fontWeight: "700", marginBottom: "0.65rem" }}>
              Recent Razorpay Transactions
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "200px", overflowY: "auto" }}>
              {customerDetail?.payments?.map(p => (
                <div key={p.id} style={{
                  background: "var(--bg-surface-raised)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.6rem 0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: "600" }}>{p.description}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{p.rzp_payment_link_id || p.id}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "700", fontFamily: "var(--font-mono)" }}>{formatINR(p.amount)}</div>
                    <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  const name = selectedCustomer.name;
                  setSelectedCustomer(null);
                  onPromptAgent(`Audit customer ${name} and prepare recovery`);
                }}
              >
                <Bot size={15} /> Audit With PayPilot Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
