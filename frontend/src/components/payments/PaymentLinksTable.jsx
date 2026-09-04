import React, { useState } from "react";
import { 
  Link as LinkIcon, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Plus, 
  X, 
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";
import { createPaymentLink, syncPaymentLink } from "../../services/api";

export default function PaymentLinksTable({ 
  paymentLinks, 
  customers, 
  onRefreshData 
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Modal Form state
  const [formData, setFormData] = useState({
    customer_id: "",
    amount: "",
    description: "",
    expire_in_hours: 48
  });
  const [creating, setCreating] = useState(false);

  const formatINR = (val) => {
    return "₹" + Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  };

  const copyToClipboard = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      await syncPaymentLink(id);
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error("Failed to sync link:", e);
    } finally {
      setSyncingId(null);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    setCreating(true);
    try {
      await createPaymentLink({
        customer_id: formData.customer_id || null,
        amount: parseFloat(formData.amount),
        description: formData.description,
        expire_in_hours: parseInt(formData.expire_in_hours || 48)
      });
      setShowCreateModal(false);
      setFormData({ customer_id: "", amount: "", description: "", expire_in_hours: 48 });
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error("Error creating payment link:", e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="table-card">
        <div className="table-header-box">
          <div className="table-title">
            <LinkIcon size={18} color="var(--primary)" />
            Razorpay Payment Links & Collections Hub
          </div>

          <div style={{ display: "flex", gap: "0.65rem" }}>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={14} /> Create Payment Link
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Payment Link ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Description / Purpose</th>
              <th>Status</th>
              <th>Short URL / Checkout</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(paymentLinks || []).map(l => (
              <tr key={l.id}>
                <td>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--primary-brand)", fontWeight: "600" }}>
                    {l.rzp_payment_link_id || l.id.slice(0, 12)}
                  </span>
                  {l.rzp_payment_id && (
                    <div style={{ fontSize: "0.72rem", color: "var(--success-text)", fontWeight: "600", marginTop: "2px" }}>
                      Pay ID: {l.rzp_payment_id}
                    </div>
                  )}
                </td>

                <td>
                  <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{l.customer_name}</div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{l.customer_email}</div>
                </td>

                <td style={{ fontFamily: "var(--font-mono)", fontWeight: "700", fontSize: "0.92rem", color: "var(--text-main)" }}>
                  {formatINR(l.amount)}
                </td>

                <td style={{ maxWidth: "260px" }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {l.description || "Payment Link"}
                  </div>
                  {l.failure_reason && (
                    <div style={{ fontSize: "0.72rem", color: "var(--danger-text)", fontWeight: "600", marginTop: "0.2rem" }}>
                      ⚠️ {l.failure_reason}
                    </div>
                  )}
                </td>

                <td>
                  <span className={`badge badge-${l.status.toLowerCase()}`}>
                    {l.status}
                  </span>
                </td>

                <td>
                  {l.short_url ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => copyToClipboard(l.short_url, l.id)}
                        title="Copy payment link or Bill PDF URL"
                      >
                        {copiedId === l.id ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                        Copy
                      </button>
                      <a 
                        href={l.short_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`btn btn-sm ${l.short_url.includes(".pdf") ? "btn-outline" : "btn-primary"}`}
                        title={l.short_url.includes(".pdf") ? "Open official Khushi Threads Bill PDF" : "Open Razorpay checkout preview"}
                        style={l.short_url.includes(".pdf") ? { borderColor: "#cbd5e1", color: "#0f172a", fontWeight: "600" } : {}}
                      >
                        {l.short_url.includes(".pdf") ? <FileText size={12} /> : <ExternalLink size={12} />}
                        {l.short_url.includes(".pdf") ? "Bill PDF" : "Checkout"}
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>N/A</span>
                  )}
                </td>

                <td style={{ textAlign: "right" }}>
                  <button 
                    className="btn btn-outline btn-sm"
                    disabled={syncingId === l.id}
                    onClick={() => handleSync(l.id)}
                    title="Sync live status with Razorpay API"
                  >
                    <RefreshCw size={12} className={syncingId === l.id ? "spin" : ""} />
                    Sync
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual Create Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Razorpay Payment Link</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCreateModal(false)}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                  Select Customer (Optional)
                </label>
                <select 
                  className="chat-input"
                  style={{ width: "100%", background: "#ffffff" }}
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                >
                  <option value="">Custom / Direct Recipient</option>
                  {(customers || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company_name}) - Outstanding: {formatINR(c.outstanding_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                  Amount (INR) *
                </label>
                <input 
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  className="chat-input"
                  style={{ width: "100%" }}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                  Invoice Description *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Milestone 2 Retainer for Website Project"
                  className="chat-input"
                  style={{ width: "100%" }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                  Link Expiry (Hours)
                </label>
                <input 
                  type="number"
                  placeholder="48"
                  className="chat-input"
                  style={{ width: "100%" }}
                  value={formData.expire_in_hours}
                  onChange={(e) => setFormData({ ...formData, expire_in_hours: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", marginTop: "0.5rem" }}>
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create on Razorpay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
