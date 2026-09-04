import React, { useState, useEffect } from "react";
import Navbar from "./components/common/Navbar";
import RevenueHQ from "./components/dashboard/RevenueHQ";
import AgentChat from "./components/agent/AgentChat";
import CustomerLedger from "./components/customers/CustomerLedger";
import PaymentLinksTable from "./components/payments/PaymentLinksTable";
import ApprovalsQueue from "./components/approvals/ApprovalsQueue";
import AuditTrail from "./components/audit/AuditTrail";
import IntegrationsHub from "./components/integrations/IntegrationsHub";
import WebhookSimulatorModal from "./components/common/WebhookSimulatorModal";

import { 
  fetchOverviewMetrics, 
  fetchAgingBuckets, 
  fetchCustomers, 
  fetchPaymentLinks, 
  fetchApprovals, 
  fetchAuditLogs, 
  resetDemoScenario,
  syncKhushiData
} from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("agent");
  const [metrics, setMetrics] = useState(null);
  const [agingData, setAgingData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [agentInitialPrompt, setAgentInitialPrompt] = useState(null);
  const [showWebhookSimulator, setShowWebhookSimulator] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isSyncingKhushi, setIsSyncingKhushi] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const loadAllData = async () => {
    try {
      const [m, ag, c, pl, app, aud] = await Promise.all([
        fetchOverviewMetrics().catch(() => null),
        fetchAgingBuckets().catch(() => null),
        fetchCustomers().catch(() => []),
        fetchPaymentLinks().catch(() => []),
        fetchApprovals().catch(() => []),
        fetchAuditLogs().catch(() => [])
      ]);

      if (m) setMetrics(m);
      if (ag) setAgingData(ag);
      if (c) setCustomers(Array.isArray(c) ? c : (c?.items || []));
      if (pl) setPaymentLinks(Array.isArray(pl) ? pl : (pl?.items || []));
      if (app) setApprovals(Array.isArray(app) ? app : (app?.items || []));
      if (aud) setAuditLogs(Array.isArray(aud) ? aud : (aud?.items || []));
    } catch (err) {
      console.error("Failed to load PayPilot business data:", err);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000); // Polling update
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    try {
      await resetDemoScenario();
      await loadAllData();
      showToast("Khushi Threads production data reloaded: 54 invoices, 2 customers, ₹36,321 receivables.");
    } catch (e) {
      console.error("Failed to reset demo:", e);
    }
  };

  const handleSyncKhushi = async () => {
    setIsSyncingKhushi(true);
    try {
      const res = await syncKhushiData();
      await loadAllData();
      const count = res.total_invoices || 54;
      const amt = (res.total_outstanding_rupees || 36321).toLocaleString('en-IN');
      showToast(`⚡ Synchronized with Khushi Threads live: ${count} invoices, ${res.active_customers || 2} customers, ₹${amt} total receivables!`);
    } catch (e) {
      console.error("Failed to sync Khushi Threads data:", e);
      showToast("Sync completed with cached snapshot.");
      await loadAllData();
    } finally {
      setIsSyncingKhushi(false);
    }
  };

  const handlePromptAgent = (promptText) => {
    setAgentInitialPrompt(promptText);
    setActiveTab("agent");
  };

  const pendingApprovalsCount = (approvals || []).filter(a => a.status === "PENDING").length;

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "var(--radius-lg)",
          padding: "0.85rem 1.25rem",
          color: "#ffffff",
          fontSize: "0.84rem",
          fontWeight: "600",
          boxShadow: "var(--shadow-xl)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          maxWidth: "420px",
          lineHeight: "1.4"
        }}>
          <span style={{ fontSize: "1rem" }}>⚡</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        pendingApprovalsCount={pendingApprovalsCount}
        onResetDemo={handleResetDemo}
        onSyncKhushi={handleSyncKhushi}
        isSyncingKhushi={isSyncingKhushi}
        onOpenWebhookSimulator={() => setShowWebhookSimulator(false)}
        onOpenModal={() => setShowWebhookSimulator(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === "agent" && (
          <AgentChat 
            onRefreshData={loadAllData}
            initialPrompt={agentInitialPrompt}
            metrics={metrics}
            customers={customers}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "revenue" && (
          <RevenueHQ 
            metrics={metrics}
            agingData={agingData}
            onPromptAgent={handlePromptAgent}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "customers" && (
          <CustomerLedger 
            customers={customers}
            onPromptAgent={handlePromptAgent}
            onRefreshData={loadAllData}
          />
        )}

        {activeTab === "links" && (
          <PaymentLinksTable 
            paymentLinks={paymentLinks}
            customers={customers}
            onRefreshData={loadAllData}
          />
        )}

        {activeTab === "approvals" && (
          <ApprovalsQueue 
            approvals={approvals}
            onRefreshData={loadAllData}
          />
        )}

        {activeTab === "integrations" && (
          <IntegrationsHub 
            onRefreshData={loadAllData}
            customers={customers}
          />
        )}

        {activeTab === "audit" && (
          <AuditTrail 
            auditLogs={auditLogs}
          />
        )}
      </main>

      {/* Webhook Simulator Modal */}
      {showWebhookSimulator && (
        <WebhookSimulatorModal 
          customers={customers}
          onClose={() => setShowWebhookSimulator(false)}
          onSuccess={(res) => {
            loadAllData();
            showToast(res.message);
          }}
        />
      )}
    </div>
  );
}
