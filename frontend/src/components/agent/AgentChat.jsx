import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  RotateCcw,
  Zap
} from "lucide-react";
import ActionCard from "./ActionCard";

export default function AgentChat({ 
  onRefreshData, 
  initialPrompt = null 
}) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome_01",
      role: "agent",
      content: "Hello Rohan! I am **PayPilot**, your autonomous AI Revenue Agent.\n\nI am actively monitoring your **Apex Studios** receivables on Razorpay rails. I have identified **₹75,500 overdue balance** across 3 clients that can be recovered today.\n\nHow would you like to proceed?",
      traces: [
        { type: "thought", text: "Connected to Razorpay Merchant Account rohan@apexstudios.in" },
        { type: "tool", text: "Ledger status: 3 overdue accounts detected" }
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
                    { type: "tool_call", text: `Calling Tool: ${data.tool}(${JSON.stringify(data.args || {})})` }
                  ];
                } else if (eventType === "tool_result") {
                  updatedMsg.traces = [
                    ...updatedMsg.traces,
                    { type: "tool_result", text: `Tool Result: ${data.tool} returned data` }
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div className="avatar avatar-agent">
              <Bot size={16} />
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>PayPilot Revenue Agent</div>
              <div style={{ fontSize: "0.72rem", color: "var(--success)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                Online • LangGraph + Razorpay Engine Connected
              </div>
            </div>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Deterministic Financial Guardrails Active
          </div>
        </div>

        {/* Message Stream */}
        <div className="chat-messages">
          {messages.map(m => (
            <div key={m.id} className={`message-row ${m.role}`}>
              <div className={`avatar avatar-${m.role}`}>
                {m.role === "agent" ? <Bot size={16} /> : <User size={16} />}
              </div>

              <div style={{ maxWidth: "88%" }}>
                {/* Reasoning & Traces Drawer */}
                {m.traces && m.traces.length > 0 && (
                  <div className="reasoning-drawer">
                    <div style={{ fontWeight: "700", color: "#818cf8", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Terminal size={12} /> Execution Traces & Tools
                    </div>
                    {m.traces.map((t, idx) => (
                      <div key={idx} className="trace-item">
                        <span className="trace-pulse" />
                        <span>{t.text}</span>
                      </div>
                    ))}
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
          ))}

          {isStreaming && (
            <div className="message-row agent">
              <div className="avatar avatar-agent">
                <Bot size={16} />
              </div>
              <div className="message-bubble" style={{ color: "var(--text-muted)", fontStyle: "italic", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Clock size={14} className="spin" />
                PayPilot is reasoning, executing database tools, and planning...
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
              <Sparkles size={12} style={{ marginRight: "4px" }} />
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <input 
            type="text"
            className="chat-input"
            placeholder="Ask PayPilot (e.g. 'Who owes me money?', 'Create ₹25,000 link for Rahul')..."
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
            <Send size={15} />
            Send
          </button>
        </div>
      </div>

      {/* Right Sidebar: Agent Live Insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="table-card" style={{ padding: "1.15rem" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Zap size={15} color="var(--primary)" />
            Agent Capabilities
          </h4>
          <ul style={{ fontSize: "0.78rem", color: "var(--text-secondary)", listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={13} color="var(--success)" />
              <strong>Receivables Auditing</strong> — 1-click overdue identification
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={13} color="var(--success)" />
              <strong>Recovery Campaigns</strong> — Staging personalized payment links
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={13} color="var(--success)" />
              <strong>Official Razorpay Links</strong> — Custom expiries & SMS/Email
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={13} color="var(--success)" />
              <strong>2-Phase Commit HITL</strong> — Zero unauthorized mutations
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={13} color="var(--success)" />
              <strong>Real-time HMAC Webhooks</strong> — Auto ledger reconciliation
            </li>
          </ul>
        </div>

        <div className="table-card" style={{ padding: "1.15rem" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.65rem" }}>
            🛡️ Financial Safety Guardrails
          </h4>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
            PayPilot executes <strong>deterministic SQL aggregations</strong> for revenue numbers and enforces a mandatory <strong>Human-in-the-Loop review</strong> before creating any financial payment resource.
          </p>
        </div>
      </div>
    </div>
  );
}
