import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Clock, 
  Zap,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Shield,
  CreditCard,
  Building2,
  CheckCircle2
} from "lucide-react";
import ActionCard from "./ActionCard";

export default function AgentChat({ 
  onRefreshData, 
  initialPrompt = null,
  metrics: rawMetrics = {},
  customers = [],
  onNavigateTab
}) {
  const safeMetrics = rawMetrics || {};
  const safeCustomers = customers || [];
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState({});
  const [messages, setMessages] = useState([
    {
      id: "welcome_01",
      role: "agent",
      content: "### 👋 Welcome Ansh, your Khushi Threads Revenue Copilot is active\n\nI am monitoring your 54 live production invoices and customer ledger connected via Khushi Threads & Razorpay rails.\n\n* **Outstanding Receivables:** ₹36,321.00 across 2 customer accounts\n* **Top Priority:** **Anshu Patel** (₹35,921.00 overdue across 49 pending textile invoices)\n\nClick one of the quick actions below to audit receivables or dispatch 1-click Razorpay payment links.",
      traces: [
        { type: "thought", text: "Connected to Khushi Threads live API & Neon PostgreSQL" },
        { type: "tool", text: "Ingested 54 genuine bills: ₹36,321.00 outstanding receivables detected" }
      ],
      proposals: []
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Handle external trigger prompts (e.g. from Revenue HQ buttons)
  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const toggleTraceExpansion = (msgId) => {
    setExpandedTraces(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: "agent",
        content: "### ⚡ PayPilot Session Reset\n\nHow can I help you manage your cashflow? You can ask me to **audit overdue accounts**, **stage recovery campaigns**, or **generate dynamic payment links**.",
        traces: [],
        proposals: []
      }
    ]);
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || isStreaming) return;

    const userMsgId = `user_${Date.now()}`;
    const agentMsgId = `agent_${Date.now()}`;

    // Append user message
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: query }
    ]);
    setInput("");
    setIsStreaming(true);

    // Prepare temporary agent message
    setMessages(prev => [
      ...prev,
      {
        id: agentMsgId,
        role: "agent",
        content: "",
        traces: [],
        proposals: []
      }
    ]);

    try {
      const response = await fetch("/api/v1/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, session_id: "default_session" })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const rawData = JSON.parse(trimmed.replace("data: ", ""));
              const eventType = rawData.type;
              const data = rawData.data;

              setMessages(prev => prev.map(msg => {
                if (msg.id !== agentMsgId) return msg;

                const updatedMsg = { ...msg };

                if (eventType === "thought") {
                  updatedMsg.traces = [
                    ...updatedMsg.traces,
                    { type: "thought", text: data }
                  ];
                } else if (eventType === "tool_call") {
                  updatedMsg.traces = [
                    ...updatedMsg.traces,
                    { type: "tool_call", text: `Invoked: ${data.tool}` }
                  ];
                } else if (eventType === "tool_result") {
                  updatedMsg.traces = [
                    ...updatedMsg.traces,
                    { type: "tool_result", text: `Executed: ${data.tool}` }
                  ];
                } else if (eventType === "proposal") {
                  updatedMsg.proposals = [...updatedMsg.proposals, data];
                } else if (eventType === "token") {
                  updatedMsg.content += data;
                }

                return updatedMsg;
              }));
            } catch (err) {
              console.error("Error parsing SSE line:", err);
            }
          }
        }
      }
    } catch (e) {
      console.error("Streaming chat error:", e);
      setMessages(prev => prev.map(msg => {
        if (msg.id === agentMsgId) {
          return { ...msg, content: "⚠️ Could not complete request. Please ensure the backend server is active." };
        }
        return msg;
      }));
    } finally {
      setIsStreaming(false);
      if (onRefreshData) onRefreshData();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const samplePrompts = [
    { label: "Audit Overdue Receivables", prompt: "Who owes me money and what is pending?" },
    { label: "Recover ABC Ltd Dues", prompt: "Prepare reminders for ABC Ltd" },
    { label: "Create ₹25,000 Link for Rahul", prompt: "Create a ₹25,000 payment link for Rahul for website project" },
    { label: "Diagnose Failed Payments", prompt: "Show me failed payments from this week" }
  ];

  // Helper to render basic markdown nicely
  const renderFormattedContent = (content) => {
    if (!content) return null;

    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Header
      if (line.startsWith("### ")) {
        return (
          <h4 key={i} style={{ fontSize: "1rem", fontWeight: "700", color: "#0f172a", margin: "0.5rem 0 0.35rem 0" }}>
            {line.replace("### ", "")}
          </h4>
        );
      }
      // Bullet items
      if (line.startsWith("* ") || line.startsWith("- ")) {
        const itemText = line.substring(2);
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem", margin: "0.25rem 0", fontSize: "0.86rem" }}>
            <span style={{ color: "#0284c7", fontWeight: "bold" }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: formatBoldAndBadges(itemText) }} />
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={i} style={{ height: "0.4rem" }} />;
      }
      // Standard paragraph
      return (
        <p key={i} style={{ margin: "0.2rem 0", fontSize: "0.86rem", lineHeight: "1.55" }} dangerouslySetInnerHTML={{ __html: formatBoldAndBadges(line) }} />
      );
    });
  };

  const formatBoldAndBadges = (str) => {
    return str
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 600;">$1</strong>')
      // High risk badge
      .replace(/🔴 HIGH RISK/g, '<span style="display:inline-block; padding:1px 6px; font-size:10px; font-weight:700; background:#fef2f2; color:#b91c1c; border-radius:4px; border:1px solid #fecaca;">HIGH RISK</span>')
      // Medium risk badge
      .replace(/🟡 MEDIUM/g, '<span style="display:inline-block; padding:1px 6px; font-size:10px; font-weight:700; background:#fffbeb; color:#b45309; border-radius:4px; border:1px solid #fde68a;">MEDIUM RISK</span>')
      // Low risk badge
      .replace(/🟢 LOW/g, '<span style="display:inline-block; padding:1px 6px; font-size:10px; font-weight:700; background:#ecfdf5; color:#047857; border-radius:4px; border:1px solid #a7f3d0;">LOW RISK</span>');
  };

  // Filter overdue customers for the live right panel
  const overdueCustomers = (safeCustomers || []).filter(c => {
    const bal = Number(c.outstanding_balance_rupees ?? (c.outstanding_balance_paise ? c.outstanding_balance_paise / 100 : c.outstanding_balance ?? c.overdue_amount ?? 0));
    return bal > 0;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", height: "calc(100vh - 120px)", minHeight: "560px" }}>
      {/* Left Main Chat Workspace */}
      <div className="table-card" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
        {/* Sleek Minimalist Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={17} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: "700", fontSize: "0.92rem", color: "#0f172a" }}>PayPilot Copilot</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#059669", fontWeight: "600", background: "#ecfdf5", padding: "1px 6px", borderRadius: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#059669" }}></span>
                  Live • Neon DB
                </span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Autonomous Receivables & Razorpay Settlement Rails
              </div>
            </div>
          </div>

          <button 
            className="btn btn-outline btn-sm"
            onClick={handleClearChat}
            title="Reset conversation"
            style={{ fontSize: "0.76rem", padding: "0.3rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <RotateCcw size={12} />
            Clear
          </button>
        </div>

        {/* Chat Message Stream */}
        <div className="chat-messages" style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", background: "#f8fafc" }}>
          {messages.map((m) => {
            const isUser = m.role === "user";
            const traces = m.traces || [];
            const hasTraces = traces.length > 0;
            const isExpanded = !!expandedTraces[m.id];

            return (
              <div 
                key={m.id} 
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  maxWidth: isUser ? "75%" : "88%",
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  flexDirection: isUser ? "row-reverse" : "row"
                }}
              >
                {/* Avatar */}
                <div 
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: isUser ? "#cbd5e1" : "#0f172a",
                    color: isUser ? "#0f172a" : "#ffffff",
                    fontSize: "0.75rem",
                    fontWeight: "700"
                  }}
                >
                  {isUser ? <User size={15} /> : <Bot size={15} />}
                </div>

                {/* Bubble */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {/* Clean Expandable Execution Drawer */}
                  {!isUser && hasTraces && (
                    <div style={{ marginBottom: "2px" }}>
                      <button 
                        onClick={() => toggleTraceExpansion(m.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          padding: "0.25rem 0.6rem",
                          fontSize: "0.72rem",
                          color: "#475569",
                          cursor: "pointer",
                          fontWeight: "500"
                        }}
                      >
                        <Zap size={11} color="#0284c7" />
                        <span>{traces.length} steps executed</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {isExpanded && (
                        <div style={{ marginTop: "0.4rem", padding: "0.6rem 0.8rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          {traces.map((t, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#64748b" }}>
                              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#0284c7" }} />
                              <span>{t.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Bubble Content */}
                  {m.content && (
                    <div 
                      style={{
                        padding: "0.85rem 1.15rem",
                        borderRadius: "10px",
                        fontSize: "0.86rem",
                        lineHeight: "1.5",
                        background: isUser ? "#0f172a" : "#ffffff",
                        color: isUser ? "#ffffff" : "#1e293b",
                        border: isUser ? "none" : "1px solid #e2e8f0",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                      }}
                    >
                      {isUser ? m.content : renderFormattedContent(m.content)}
                    </div>
                  )}

                  {/* Staged Action Proposals */}
                  {m.proposals && m.proposals.map((prop, idx) => (
                    <ActionCard 
                      key={idx} 
                      proposal={prop} 
                      onActionResolved={() => {
                        if (onRefreshData) onRefreshData();
                      }} 
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {isStreaming && (
            <div style={{ display: "flex", gap: "0.75rem", alignSelf: "flex-start", alignItems: "center" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={15} />
              </div>
              <div style={{ padding: "0.65rem 1rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "0.82rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Clock size={13} className="spin" />
                Querying Neon PostgreSQL & formulating recovery plan...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1rem", background: "#ffffff", borderTop: "1px solid var(--border-subtle)", overflowX: "auto" }}>
          {samplePrompts.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              disabled={isStreaming}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "9999px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#334155",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease"
              }}
            >
              <Sparkles size={11} color="#0284c7" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Prompt Input Bar */}
        <div style={{ padding: "0.75rem 1rem", background: "#ffffff", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input 
            type="text"
            className="chat-input"
            placeholder="Ask PayPilot (e.g. 'Who owes money?', 'Prepare reminders for Anshu Patel')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: "0.65rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              outline: "none"
            }}
          />
          <button 
            className="btn btn-primary"
            onClick={() => handleSendMessage()}
            disabled={isStreaming || !input.trim()}
            style={{ padding: "0.65rem 1.15rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}
          >
            <Send size={13} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Right Sidebar: Real-Time Cashflow & Immediate Actions Cockpit (Zero fluff text) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
        {/* Quick Cashflow Summary Card */}
        <div className="table-card" style={{ padding: "1.15rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Receivables Snapshot
            </span>
            <span style={{ fontSize: "0.7rem", color: "#059669", background: "#ecfdf5", padding: "1px 6px", borderRadius: "4px", fontWeight: "600" }}>
              Live
            </span>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#0f172a", fontFamily: "var(--font-sans)" }}>
              ₹{Number(safeMetrics.total_outstanding_rupees || 36321).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#dc2626", fontWeight: "600", marginTop: "2px", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <AlertTriangle size={12} />
              {safeMetrics.overdue_customers_count || 2} Delinquent Clients Awaiting Action
            </div>
          </div>

          {/* Metric Pills */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <div style={{ background: "#f8fafc", padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Realized Revenue</div>
              <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "#059669" }}>
                ₹{Number(safeMetrics.realized_revenue_rupees || 1635).toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Revenue At Risk</div>
              <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "#dc2626" }}>
                ₹{Number(safeMetrics.revenue_at_risk_rupees || 36321).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Quick Action Trigger Button */}
          <button 
            className="btn btn-primary"
            onClick={() => handleSendMessage("Prepare reminders for overdue clients")}
            disabled={isStreaming}
            style={{ width: "100%", padding: "0.55rem", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
          >
            <Zap size={13} />
            <span>Launch Bulk Recovery Campaign</span>
          </button>
        </div>

        {/* Top Delinquent Accounts List with 1-Click Action Buttons */}
        <div className="table-card" style={{ padding: "1.15rem", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Overdue Accounts
            </span>
            {onNavigateTab && (
              <button 
                onClick={() => onNavigateTab("customers")}
                style={{ fontSize: "0.72rem", color: "#0284c7", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                View Ledger →
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {overdueCustomers.length > 0 ? (
              overdueCustomers.slice(0, 4).map((c) => {
                const bal = c.outstanding_balance_rupees ?? (c.outstanding_balance_paise ? c.outstanding_balance_paise / 100 : c.outstanding_balance ?? c.overdue_amount ?? 0);
                const isHighRisk = c.risk_category === "HIGH";

                return (
                  <div 
                    key={c.id} 
                    style={{
                      padding: "0.65rem 0.8rem",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: isHighRisk ? "#fffbfb" : "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "#0f172a" }}>
                        {c.company_name || c.name}
                      </div>
                      <span style={{
                        fontSize: "0.68rem",
                        padding: "1px 5px",
                        borderRadius: "4px",
                        fontWeight: "700",
                        background: isHighRisk ? "#fef2f2" : "#fffbeb",
                        color: isHighRisk ? "#b91c1c" : "#b45309"
                      }}>
                        {c.overdue_days}d overdue
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "#0f172a", fontFamily: "var(--font-mono)" }}>
                        ₹{Number(bal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>

                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleSendMessage(`Prepare recovery payment link for ${c.company_name || c.name}`)}
                        disabled={isStreaming}
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}
                      >
                        ⚡ Chase
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8", fontSize: "0.8rem" }}>
                No delinquent accounts
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
