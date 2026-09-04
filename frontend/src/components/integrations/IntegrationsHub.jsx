import React, { useState, useEffect, useRef } from "react";
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Key, 
  Code2, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  FileText, 
  Send, 
  Zap, 
  ExternalLink,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle
} from "lucide-react";
import { 
  uploadBillingFile, 
  fetchApiKeys, 
  syncExternalInvoice, 
  simulateInstantPayment,
  fetchCustomers 
} from "../../services/api";
import WhatsAppModal from "../common/WhatsAppModal";

export default function IntegrationsHub({ onRefreshData, customers = [] }) {
  const [activeSubTab, setActiveSubTab] = useState("importer"); // "importer", "api", "whatsapp"
  
  // File Importer State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // API Credentials State
  const [credentials, setCredentials] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState("curl");

  // Inbound API Test Runner State
  const [apiTestForm, setApiTestForm] = useState({
    customer_name: "Ramesh Textiles Surat",
    phone: "+919825109876",
    invoice_no: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
    amount_rupees: 8750.00
  });
  const [apiTestLoading, setApiTestLoading] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);

  // WhatsApp Dispatch State
  const [selectedWhatsAppCustomer, setSelectedWhatsAppCustomer] = useState(null);

  useEffect(() => {
    fetchApiKeys()
      .then(res => setCredentials(res))
      .catch(err => console.error("Failed to fetch API keys:", err));
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setUploadError(null);
      setUploadResult(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const res = await uploadBillingFile(file);
      setUploadResult(res);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setUploadError(err.message || "Upload failed. Please check file format.");
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const handleRunApiTest = async (e) => {
    e.preventDefault();
    setApiTestLoading(true);
    setApiTestResult(null);
    try {
      const res = await syncExternalInvoice({
        customer_name: apiTestForm.customer_name,
        phone: apiTestForm.phone,
        invoice_no: apiTestForm.invoice_no,
        amount_rupees: parseFloat(apiTestForm.amount_rupees)
      });
      setApiTestResult(res);
      if (onRefreshData) onRefreshData();
      // Generate next random invoice no for testing
      setApiTestForm(prev => ({
        ...prev,
        invoice_no: `INV-2026-${Math.floor(100 + Math.random() * 900)}`
      }));
    } catch (err) {
      alert("API Sync Failed: " + err.message);
    } finally {
      setApiTestLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = "Party Name,Mobile Number,Bill No,Amount Pending\n" +
      "Shree Balaji Traders,+919876543210,INV-BALAJI-101,14500.00\n" +
      "Gujarat Cotton Hub,+919825123456,INV-COTTON-204,22800.00\n" +
      "Arihant Enterprise,+919909012345,INV-ARI-305,9200.00\n" +
      "Surat Silk Mills,+919898098765,INV-SSM-401,31000.00\n";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_billing_invoices.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "var(--shadow-md)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{
              background: "#3b82f6",
              color: "#ffffff",
              fontSize: "0.72rem",
              fontWeight: "700",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              textTransform: "uppercase"
            }}>
              Universal Ingestion & Connectivity
            </span>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>v2.4 Live</span>
          </div>
          <h2 style={{ margin: "0.25rem 0", fontSize: "1.4rem", fontWeight: "700" }}>
            Integrations & Billing Importer Hub
          </h2>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.86rem", maxWidth: "600px" }}>
            Connect any billing software (Tally, Vyapar, Marg, Zoho) via live API keys, 
            or drag-and-drop any CSV / Excel / PDF invoice file to ingest pending dues and trigger 1-click WhatsApp payments.
          </p>
        </div>

        {/* Sub-Tabs Switcher */}
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius-md)",
          padding: "0.3rem",
          display: "flex",
          gap: "0.3rem"
        }}>
          <button
            onClick={() => setActiveSubTab("importer")}
            style={{
              background: activeSubTab === "importer" ? "#ffffff" : "transparent",
              color: activeSubTab === "importer" ? "#0f172a" : "#cbd5e1",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.2s"
            }}
          >
            <FileSpreadsheet size={15} />
            Smart File Importer
          </button>

          <button
            onClick={() => setActiveSubTab("api")}
            style={{
              background: activeSubTab === "api" ? "#ffffff" : "transparent",
              color: activeSubTab === "api" ? "#0f172a" : "#cbd5e1",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.2s"
            }}
          >
            <Key size={15} />
            API Keys & Webhooks
          </button>

          <button
            onClick={() => setActiveSubTab("whatsapp")}
            style={{
              background: activeSubTab === "whatsapp" ? "#ffffff" : "transparent",
              color: activeSubTab === "whatsapp" ? "#0f172a" : "#cbd5e1",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.2s"
            }}
          >
            <MessageCircle size={15} />
            WhatsApp UPI Hub
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SMART FILE IMPORTER */}
      {activeSubTab === "importer" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          {/* Left: Upload Dropzone Card */}
          <div className="table-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "700", color: "#0f172a", fontSize: "1.05rem" }}>
                <UploadCloud size={20} color="#2563eb" />
                Upload Billing Data File
              </div>
              <button
                onClick={downloadSampleCSV}
                className="btn btn-outline btn-sm"
                style={{ fontSize: "0.76rem", gap: "0.3rem" }}
              >
                <Download size={13} />
                Download Sample CSV
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1.25rem" }}>
              Our AI parser automatically maps customer names, contact numbers, bill numbers, and pending balances from any CSV, Excel spreadsheet (.xlsx, .xls), or PDF invoice.
            </p>

            {/* Drop Zone Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: "var(--radius-lg)",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                background: file ? "#eff6ff" : "#f8fafc",
                cursor: "pointer",
                transition: "all 0.2s",
                position: "relative"
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls, .pdf"
                style={{ display: "none" }}
              />
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: file ? "#dbeafe" : "#f1f5f9",
                color: file ? "#2563eb" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.75rem"
              }}>
                <FileSpreadsheet size={24} />
              </div>

              {file ? (
                <div>
                  <div style={{ fontWeight: "700", color: "#1e40af", fontSize: "0.95rem" }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                    {(file.size / 1024).toFixed(1)} KB • Click to choose a different file
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "0.92rem" }}>
                    Click or drag & drop file here
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>
                    Supports CSV, Excel (.xlsx, .xls) and PDF bill statements
                  </div>
                </div>
              )}
            </div>

            {/* Upload Action */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.25rem" }}>
              <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                Auto-syncs customer balances into PayPilot ledger.
              </div>
              <button
                className="btn btn-primary"
                onClick={handleUploadSubmit}
                disabled={!file || uploading}
                style={{ minWidth: "140px" }}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                    Parsing File...
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    Ingest & Sync Bills
                  </>
                )}
              </button>
            </div>

            {/* Error Display */}
            {uploadError && (
              <div style={{
                marginTop: "1rem",
                padding: "0.85rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "var(--radius-md)",
                color: "#b91c1c",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <AlertCircle size={16} />
                {uploadError}
              </div>
            )}
          </div>

          {/* Right: Upload Results & Column Mapping */}
          <div className="table-card" style={{ padding: "1.5rem" }}>
            <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "1.05rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle2 size={18} color="#16a34a" />
              Ingestion Results & Ledger Impact
            </div>

            {uploadResult ? (
              <div>
                <div style={{
                  padding: "1rem",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1rem"
                }}>
                  <div style={{ fontWeight: "700", color: "#166534", fontSize: "0.95rem" }}>
                    ✅ File Successfully Processed: {uploadResult.filename}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <div style={{ background: "#ffffff", padding: "0.6rem", borderRadius: "6px", border: "1px solid #dcfce7" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Bills Processed</span>
                      <div style={{ fontWeight: "800", fontSize: "1.1rem", color: "#0f172a" }}>
                        {uploadResult.imported_bills_count}
                      </div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "0.6rem", borderRadius: "6px", border: "1px solid #dcfce7" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Total Ingested Receivables</span>
                      <div style={{ fontWeight: "800", fontSize: "1.1rem", color: "#16a34a" }}>
                        ₹{uploadResult.total_amount_rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#475569", marginBottom: "0.5rem" }}>
                  Detected Accounting Columns:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
                  <span className="badge badge-low">Name: {uploadResult.detected_columns.name_column || "Found"}</span>
                  <span className="badge badge-low">Phone: {uploadResult.detected_columns.phone_column || "Found"}</span>
                  <span className="badge badge-low">Bill No: {uploadResult.detected_columns.bill_column || "Generated"}</span>
                  <span className="badge badge-low">Amount: {uploadResult.detected_columns.amount_column || "Found"}</span>
                </div>

                <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
                  Sample Imported Records:
                </div>
                <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "0.4rem 0.6rem" }}>Party</th>
                        <th style={{ padding: "0.4rem 0.6rem" }}>Phone</th>
                        <th style={{ padding: "0.4rem 0.6rem" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(uploadResult.sample_records || []).map((rec, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.4rem 0.6rem", fontWeight: "600" }}>{rec.name}</td>
                          <td style={{ padding: "0.4rem 0.6rem", color: "#64748b" }}>{rec.phone}</td>
                          <td style={{ padding: "0.4rem 0.6rem", fontWeight: "700", color: "#dc2626" }}>₹{rec.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "2.5rem 1rem",
                color: "#94a3b8",
                border: "1px dashed #e2e8f0",
                borderRadius: "var(--radius-md)"
              }}>
                <FileText size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
                <div style={{ fontSize: "0.86rem", fontWeight: "600", color: "#64748b" }}>
                  No File Uploaded Yet
                </div>
                <div style={{ fontSize: "0.78rem", maxWidth: "280px", margin: "0.25rem auto 0" }}>
                  Select a CSV or Excel spreadsheet on the left to see auto-detected columns and ingested customer records here.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: API KEYS & WEBHOOKS */}
      {activeSubTab === "api" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "1.5rem" }}>
          {/* Left: Credentials & Code Snippets */}
          <div className="table-card" style={{ padding: "1.5rem" }}>
            <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "1.05rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Key size={18} color="#2563eb" />
              Merchant API Credentials
            </div>

            {/* API Key Box */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "0.85rem 1rem",
              marginBottom: "1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                  Live Secret API Key
                </span>
                <span className="badge badge-low">Active Production Key</span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <code style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.84rem",
                  color: "#0f172a",
                  background: "#ffffff",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1"
                }}>
                  {showApiKey ? (credentials?.api_key || "pp_live_kt_9016929244_a87f2e1d") : "pp_live_••••••••••••••••••••••••••••"}
                </code>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="btn btn-outline btn-sm"
                  title={showApiKey ? "Hide Key" : "Reveal Key"}
                  style={{ padding: "0.45rem" }}
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => handleCopy(credentials?.api_key || "pp_live_kt_9016929244_a87f2e1d", "apiKey")}
                  className="btn btn-outline btn-sm"
                  title="Copy API Key"
                  style={{ padding: "0.45rem" }}
                >
                  {copiedSnippet === "apiKey" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Inbound Sync Endpoint */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "0.85rem 1rem",
              marginBottom: "1.25rem"
            }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" }}>
                Inbound Ingestion Webhook URL (POST)
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <code style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  color: "#0f172a",
                  background: "#ffffff",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1"
                }}>
                  {credentials?.inbound_sync_url || "http://127.0.0.1:8001/api/v1/connect/invoices"}
                </code>
                <button
                  onClick={() => handleCopy(credentials?.inbound_sync_url || "http://127.0.0.1:8001/api/v1/connect/invoices", "endpoint")}
                  className="btn btn-outline btn-sm"
                  style={{ padding: "0.45rem" }}
                >
                  {copiedSnippet === "endpoint" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Snippets Tabs */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {["curl", "python", "nodejs"].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setActiveSnippetTab(lang)}
                    style={{
                      background: activeSnippetTab === lang ? "#0f172a" : "#e2e8f0",
                      color: activeSnippetTab === lang ? "#ffffff" : "#475569",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.74rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      textTransform: "uppercase"
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleCopy(credentials?.snippets?.[activeSnippetTab] || "", "code")}
                className="btn btn-outline btn-sm"
                style={{ fontSize: "0.74rem", gap: "0.3rem" }}
              >
                {copiedSnippet === "code" ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                {copiedSnippet === "code" ? "Copied" : "Copy Snippet"}
              </button>
            </div>

            <pre style={{
              background: "#0f172a",
              color: "#f8fafc",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.78rem",
              fontFamily: "var(--font-mono)",
              overflowX: "auto",
              lineHeight: "1.4"
            }}>
              {credentials?.snippets?.[activeSnippetTab] || "Loading integration snippet..."}
            </pre>
          </div>

          {/* Right: Live API Test Runner Form */}
          <div className="table-card" style={{ padding: "1.5rem" }}>
            <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "1.05rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Code2 size={18} color="#16a34a" />
              Live Inbound API Test Runner
            </div>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1.25rem" }}>
              Simulate an external billing software sending an invoice payload. PayPilot will register the customer, compute risk, generate a Razorpay payment link, and prepare the WhatsApp dispatch link.
            </p>

            <form onSubmit={handleRunApiTest}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.76rem", fontWeight: "600", color: "#475569" }}>Customer / Party Name</label>
                  <input 
                    type="text" 
                    value={apiTestForm.customer_name} 
                    onChange={e => setApiTestForm({ ...apiTestForm, customer_name: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.84rem"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.76rem", fontWeight: "600", color: "#475569" }}>Customer Phone</label>
                    <input 
                      type="text" 
                      value={apiTestForm.phone} 
                      onChange={e => setApiTestForm({ ...apiTestForm, phone: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.84rem"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.76rem", fontWeight: "600", color: "#475569" }}>Invoice / Bill No</label>
                    <input 
                      type="text" 
                      value={apiTestForm.invoice_no} 
                      onChange={e => setApiTestForm({ ...apiTestForm, invoice_no: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.84rem"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.76rem", fontWeight: "600", color: "#475569" }}>Bill Amount (INR ₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={apiTestForm.amount_rupees} 
                    onChange={e => setApiTestForm({ ...apiTestForm, amount_rupees: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.84rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "700"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={apiTestLoading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {apiTestLoading ? "Pushing to API..." : "⚡ Execute Inbound API Call"}
                </button>
              </div>
            </form>

            {/* Test Response Output */}
            {apiTestResult && (
              <div style={{
                marginTop: "1.25rem",
                padding: "1rem",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "var(--radius-md)"
              }}>
                <div style={{ fontWeight: "700", color: "#166534", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <CheckCircle2 size={16} />
                  HTTP 200 OK — Invoice Registered!
                </div>
                <div style={{ fontSize: "0.8rem", color: "#1e293b", margin: "0.4rem 0" }}>
                  Created link for <strong>{apiTestResult.customer_name}</strong> (Bill {apiTestResult.invoice_no}) of <strong>₹{apiTestResult.amount_rupees}</strong>.
                </div>
                
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <a 
                    href={apiTestResult.whatsapp_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-sm"
                    style={{
                      background: "#25D366",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "0.76rem",
                      gap: "0.3rem",
                      textDecoration: "none"
                    }}
                  >
                    <MessageCircle size={13} />
                    Open WhatsApp Link
                  </a>
                  <button
                    onClick={() => {
                      simulateInstantPayment({
                        invoice_no: apiTestResult.invoice_no,
                        amount_rupees: apiTestResult.amount_rupees
                      }).then(() => {
                        alert("Payment simulated successfully! Check Revenue HQ or Receivables.");
                        if (onRefreshData) onRefreshData();
                      });
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: "0.76rem", gap: "0.3rem" }}
                  >
                    <Zap size={13} color="#f59e0b" />
                    Simulate Payment Received
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: WHATSAPP UPI HUB */}
      {activeSubTab === "whatsapp" && (
        <div className="table-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MessageCircle size={18} color="#25D366" />
                1-Click WhatsApp Payment Dispatch Center
              </div>
              <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.82rem" }}>
                Instantly dispatch personalized WhatsApp payment reminders with one-tap UPI links (Google Pay, PhonePe, Paytm).
              </p>
            </div>
          </div>

          <table style={{ width: "100%", fontSize: "0.84rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "0.6rem 0.75rem" }}>Customer / Party</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Mobile Number</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Outstanding Udhar</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Risk Profile</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>WhatsApp Actions</th>
              </tr>
            </thead>
            <tbody>
              {(customers || []).map(cust => (
                <tr key={cust.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.65rem 0.75rem" }}>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>{cust.name}</div>
                    <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{cust.company_name}</div>
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem", color: "#475569" }}>
                    {cust.phone}
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem" }}>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: "700",
                      color: cust.outstanding_balance > 0 ? "#dc2626" : "#16a34a"
                    }}>
                      ₹{Number(cust.outstanding_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem" }}>
                    <span className={`badge badge-${cust.risk_category.toLowerCase()}`}>
                      {cust.risk_category} RISK
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                      <button
                        onClick={() => setSelectedWhatsAppCustomer(cust)}
                        className="btn btn-sm"
                        style={{
                          background: "#25D366",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "0.78rem",
                          gap: "0.3rem",
                          padding: "0.4rem 0.75rem"
                        }}
                      >
                        <MessageCircle size={14} />
                        Send WhatsApp Link
                      </button>

                      {cust.outstanding_balance > 0 && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await simulateInstantPayment({
                                customer_id: cust.id,
                                amount_rupees: cust.outstanding_balance
                              });
                              alert(`Payment received for ${cust.name}! Outstanding balance cleared.`);
                              if (onRefreshData) onRefreshData();
                            } catch (e) {
                              alert("Error: " + e.message);
                            }
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: "0.76rem", gap: "0.3rem" }}
                          title="Simulate customer paying full balance"
                        >
                          <Zap size={13} color="#f59e0b" />
                          Simulate Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* WhatsApp Modal for Selected Customer */}
      {selectedWhatsAppCustomer && (
        <WhatsAppModal
          customer={selectedWhatsAppCustomer}
          billNo={`INV-KT-${Math.floor(1000 + Math.random() * 9000)}`}
          amountRupees={selectedWhatsAppCustomer.outstanding_balance}
          onClose={() => setSelectedWhatsAppCustomer(null)}
          onPaymentSuccess={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
}
