import React, { useState, useEffect } from "react";
import Navbar from "./components/common/Navbar";
import RevenueHQ from "./components/dashboard/RevenueHQ";
import AgentChat from "./components/agent/AgentChat";
import CustomerLedger from "./components/customers/CustomerLedger";
import PaymentLinksTable from "./components/payments/PaymentLinksTable";
import ApprovalsQueue from "./components/approvals/ApprovalsQueue";
import AuditTrail from "./components/audit/AuditTrail";
import WebhookSimulatorModal from "./components/common/WebhookSimulatorModal";

import { 
  fetchOverviewMetrics, 
  fetchAgingBuckets, 
  fetchCustomers, 
  fetchPaymentLinks, 
  fetchApprovals, 
  fetchAuditLogs, 
  resetDemoScenario 
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
      if (c) setCustomers(c);
      if (pl) setPaymentLinks(pl);
      if (app) setApprovals(app);
      if (aud) setAuditLogs(aud);
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
      showToast("Demo fixture reset! Loaded ₹75,500 overdue scenario across ABC Ltd, Rahul Sharma, and Priya Mehta.");
    } catch (e) {
      console.error("Failed to reset demo:", e);
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
        onOpenWebhookSimulator={() => setShowWebhookSimulator(false)}
        onOpenModal={() => setShowWebhookSimulator(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === "agent" && (
          <AgentChat 
            onRefreshData={loadAllData}
            initialPrompt={agentInitialPrompt}
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
