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
  CheckCircle2,
  MessageCircle
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
      content: "### 👋 Welcome back, Ansh\n\nKhushi Threads billing is connected and live.\n\n* **Pending Udhar:** ₹36,321 across pending invoices\n* **Key Account:** **Anshu Patel** (₹35,921 overdue across 49 bills)\n\nAsk any question or pick a quick action below to send WhatsApp payment links.",
      traces: [],
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
        content: "### ⚡ Chat Reset\n\nHow can I help you? You can ask me to **check pending bills**, **send WhatsApp reminders**, or **create payment links**.",
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
    { label: "💬 WhatsApp Reminders", prompt: "Prepare WhatsApp payment reminders for overdue customers" },
    { label: "📊 Show Overdue Bills", prompt: "Who owes me money and what is pending?" },
    { label: "🔗 Create Payment Link", prompt: "Create a ₹10,000 payment link for textile order" },
    { label: "📁 How to Upload Bills", prompt: "How do I import a CSV or Excel billing file into PayPilot?" }
  ];

  // Helper to render basic markdown nicely
  const renderFormattedContent = (content) => {
    if (!content) return null;

    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Header
      if (line.startsWith("### ")) {
        return (
          <h4 key={i} style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a", margin: "0.4rem 0 0.25rem 0" }}>
            {line.replace("### ", "")}
          </h4>
        );
      }
      // Bullet items
      if (line.startsWith("* ") || line.startsWith("- ")) {
        const itemText = line.substring(2);
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem", margin: "0.2rem 0", fontSize: "0.84rem" }}>
            <span style={{ color: "#0284c7", fontWeight: "bold" }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: formatBoldAndBadges(itemText) }} />
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={i} style={{ height: "0.3rem" }} />;
      }
      // Standard paragraph
      return (
        <p key={i} style={{ margin: "0.2rem 0", fontSize: "0.84rem", lineHeight: "1.5" }} dangerouslySetInnerHTML={{ __html: formatBoldAndBadges(line) }} />
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "#0f172a" }}>AI Assistant</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#059669", fontWeight: "600", background: "#ecfdf5", padding: "1px 6px", borderRadius: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#059669" }}></span>
                  Active
                </span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Automated payment recovery & WhatsApp reminders
              </div>
            </div>
          </div>

          <button 
            className="btn btn-outline btn-sm"
            onClick={handleClearChat}
            title="Reset conversation"
            style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <RotateCcw size={11} />
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

      {/* Right Sidebar: Real-Time Overview & Quick Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
        {/* Quick Summary Card */}
        <div className="table-card" style={{ padding: "1.15rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Receivables Summary
            </span>
            <span style={{ fontSize: "0.7rem", color: "#059669", background: "#ecfdf5", padding: "1px 6px", borderRadius: "4px", fontWeight: "600" }}>
              Live
            </span>
          </div>

          <div style={{ marginBottom: "0.85rem" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", fontFamily: "var(--font-sans)" }}>
              ₹{Number(safeMetrics.total_outstanding_rupees || 36321).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              {overdueCustomers.length} accounts with pending payments
            </div>
          </div>

          {/* Metric Pills */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <div style={{ background: "#f8fafc", padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Total Collected</div>
              <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "#059669" }}>
                ₹{Number(safeMetrics.realized_revenue_rupees || 1635).toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Pending Udhar</div>
              <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "#dc2626" }}>
                ₹{Number(safeMetrics.revenue_at_risk_rupees || 36321).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Quick WhatsApp Reminder Trigger */}
          <button 
            className="btn btn-primary"
            onClick={() => handleSendMessage("Prepare WhatsApp payment reminders for overdue customers")}
            disabled={isStreaming}
            style={{ width: "100%", padding: "0.55rem", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
          >
            <MessageCircle size={14} />
            <span>Send WhatsApp Reminders</span>
          </button>
        </div>

        {/* Overdue Accounts List */}
        <div className="table-card" style={{ padding: "1.15rem", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Overdue Accounts
            </span>
            {onNavigateTab && (
              <button 
                onClick={() => onNavigateTab("customers")}
                style={{ fontSize: "0.72rem", color: "#0284c7", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                View Bills →
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {overdueCustomers.length > 0 ? (
              overdueCustomers.slice(0, 4).map((c) => {
                const bal = c.outstanding_balance_rupees ?? (c.outstanding_balance_paise ? c.outstanding_balance_paise / 100 : c.outstanding_balance ?? c.overdue_amount ?? 0);
                const isHighRisk = c.risk_category === "HIGH";

                return (
                  <div 
                    key={c.id} 
                    style={{
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem"
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
                        fontWeight: "600",
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
                        onClick={() => handleSendMessage(`Prepare WhatsApp payment link for ${c.company_name || c.name}`)}
                        disabled={isStreaming}
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", gap: "0.3rem" }}
                      >
                        <MessageCircle size={11} color="#16a34a" /> Remind
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8", fontSize: "0.8rem" }}>
                No overdue accounts
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
