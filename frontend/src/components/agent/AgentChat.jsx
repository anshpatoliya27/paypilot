import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Activity
} from "lucide-react";
import ActionCard from "./ActionCard";

export default function AgentChat({ 
  onRefreshData, 
  initialPrompt = null 
}) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState({});
  const [messages, setMessages] = useState([
    {
      id: "welcome_01",
      role: "agent",
      content: "Hello Rohan! I am PayPilot, your autonomous AI Revenue Agent.\n\nI am continuously auditing your Apex Studios accounts on Razorpay rails. I have identified ₹75,500 in overdue receivables across 3 delinquent client accounts ready for recovery.\n\nHow would you like to proceed?",
      traces: [
        { type: "thought", text: "Connected to Razorpay Merchant rails: rohan@apexstudios.in" },
        { type: "tool", text: "Ledger status: 3 overdue accounts detected (₹75,500 total delinquent balance)" }
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
      const response = await fetch("http://localhost:8000/api/v1/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, session_id: "default_session" })
      });

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
          if (line.startsWith("data: ")) {
            try {
              const rawData = JSON.parse(line.replace("data: ", ""));
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
                    { type: "tool_call", text: `Tool Invocation: ${data.tool}(${JSON.stringify(data.args || {})})` }
                  ];
                } else if (eventType === "tool_result") {
                  updatedMsg.traces = [
                    ...updatedMsg.traces,
                    { type: "tool_result", text: `Tool Result: ${data.tool} executed successfully` }
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
          return { ...msg, content: "Sorry, I encountered a communication error with the backend." };
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
    "Who owes me money and what is pending?",
    "Prepare reminders for ABC Ltd",
    "Create a ₹25,000 payment link for Rahul for website project",
    "Show me failed payments from this week",
    "Give me a full revenue overview"
  ];

  return (
    <div className="agent-command-container">
      {/* Left Main Chat Panel */}
      <div className="chat-panel">
        <div className="chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div className="avatar avatar-agent">
              <Bot size={17} />
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.92rem", color: "var(--text-main)" }}>
                PayPilot Autonomous AI Agent
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--success-text)", display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: "600" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                Online • LangGraph + Razorpay Engine Connected
              </div>
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <ShieldCheck size={14} color="var(--success)" />
            <span>Deterministic Guardrails Enforced</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="chat-messages">
          {messages.map(m => {
            const isTraceExpanded = expandedTraces[m.id] !== false; // expanded by default or toggled
            return (
              <div key={m.id} className={`message-row ${m.role}`}>
                <div className={`avatar avatar-${m.role}`}>
                  {m.role === "agent" ? <Bot size={16} /> : <User size={16} />}
                </div>

                <div style={{ maxWidth: "88%" }}>
                  {/* Reasoning & Traces Drawer */}
                  {m.traces && m.traces.length > 0 && (
                    <div className="reasoning-drawer">
                      <div 
                        style={{ 
                          fontWeight: "700", 
                          color: "var(--text-main)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between",
                          cursor: "pointer",
                          userSelect: "none"
                        }}
                        onClick={() => toggleTraceExpansion(m.id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.74rem" }}>
                          <Terminal size={12} color="var(--primary-brand)" />
                          <span>Execution Steps & Tool Traces ({m.traces.length})</span>
                        </div>
                        {isTraceExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>

                      {isTraceExpanded && (
                        <div style={{ marginTop: "0.45rem", paddingTop: "0.45rem", borderTop: "1px solid var(--border-subtle)" }}>
                          {m.traces.map((t, idx) => (
                            <div key={idx} className="trace-item">
                              <span className="trace-pulse" />
                              <span style={{ color: "var(--text-secondary)" }}>{t.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Bubble */}
                  {m.content && (
                    <div className="message-bubble" style={{ whiteSpace: "pre-wrap" }}>
                      {m.content}
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
            <div className="message-row agent">
              <div className="avatar avatar-agent">
                <Bot size={16} />
              </div>
              <div className="message-bubble" style={{ color: "var(--text-muted)", fontStyle: "italic", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <Clock size={14} className="spin" />
                PayPilot is reasoning, querying receivables database, and formulating plan...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="suggestion-chips">
          {samplePrompts.map((p, i) => (
            <button 
              key={i} 
              className="chip"
              onClick={() => handleSendMessage(p)}
              disabled={isStreaming}
            >
              <Sparkles size={11} style={{ marginRight: "4px", color: "#0284c7" }} />
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <input 
            type="text"
            className="chat-input"
            placeholder="Ask PayPilot (e.g. 'Who owes me money?', 'Prepare recovery for ABC Ltd')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isStreaming}
          />
          <button 
            className="btn btn-primary"
            onClick={() => handleSendMessage()}
            disabled={isStreaming || !input.trim()}
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </div>

      {/* Right Sidebar: Agent Live Insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="table-card" style={{ padding: "1.25rem" }}>
          <h4 style={{ fontSize: "0.92rem", fontWeight: "700", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--text-main)" }}>
            <Activity size={15} color="var(--primary-brand)" />
            Agent Core Capabilities
          </h4>
          <ul style={{ fontSize: "0.8rem", color: "var(--text-secondary)", listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <CheckCircle2 size={14} color="var(--success)" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-main)" }}>Automated Receivables Auditing</strong>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Instant analysis of delinquent clients across aging buckets.</div>
              </div>
            </li>
            <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <CheckCircle2 size={14} color="var(--success)" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-main)" }}>Personalized Recovery Campaigns</strong>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Multi-client dynamic link staging with custom tone & terms.</div>
              </div>
            </li>
            <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <CheckCircle2 size={14} color="var(--success)" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-main)" }}>Official Razorpay Link Generator</strong>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Secure UPI/Card payment URLs with custom expiry timestamps.</div>
              </div>
            </li>
            <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <CheckCircle2 size={14} color="var(--success)" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-main)" }}>2-Phase Commit HITL Review</strong>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Zero unauthorized financial mutations without human approval.</div>
              </div>
            </li>
            <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <CheckCircle2 size={14} color="var(--success)" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-main)" }}>HMAC Webhook Auto-Reconciliation</strong>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Real-time balance settlement upon payment capture events.</div>
              </div>
            </li>
          </ul>
        </div>

        <div className="table-card" style={{ padding: "1.25rem", background: "var(--bg-surface-subtle)" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-main)" }}>
            <ShieldCheck size={16} color="var(--success)" />
            Enterprise Financial Guardrails
          </h4>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            PayPilot executes <strong>deterministic SQL aggregations</strong> for revenue numbers and enforces mandatory <strong>Human-in-the-Loop review</strong> before creating any external financial payment resource.
          </p>
        </div>
      </div>
    </div>
  );
}
