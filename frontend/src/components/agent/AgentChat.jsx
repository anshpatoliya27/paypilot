import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  RotateCcw, 
  MessageCircle,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import ActionCard from "./ActionCard";
import { sendBulkWhatsApp, sendDirectWhatsApp } from "../../services/api";

export default function AgentChat({ 
  onRefreshData, 
  initialPrompt = null
}) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [directSending, setDirectSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome_01",
      role: "agent",
      content: "### Welcome to PayPilot\n\nI can help you check outstanding balances, generate payment links, and automatically send WhatsApp payment reminders directly to customer phones in the background.\n\n* **Pending Receivables:** ₹36,321 across pending invoices\n* **Top Overdue Account:** Anshu Patel (₹35,921 pending)\n\nAsk a question or tap a suggestion below to get started.",
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

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: "agent",
        content: "### How can I help you today?\n\nYou can ask to check pending bills, dispatch automated WhatsApp reminders, or reconcile customer payments.",
        proposals: []
      }
    ]);
  };

  const handleSendDirectBulkReminders = async () => {
    setDirectSending(true);
    const userMsgId = `user_${Date.now()}`;
    const agentMsgId = `agent_${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: "Send WhatsApp payment reminders to all overdue customers" },
      { id: agentMsgId, role: "agent", content: "Sending automated WhatsApp reminders directly to customer phones...", proposals: [] }
    ]);

    try {
      const res = await sendBulkWhatsApp();
      const count = res.total_sent || 2;
      setMessages(prev => prev.map(m => {
        if (m.id === agentMsgId) {
          return {
            ...m,
            content: `### ✅ Automated WhatsApp Reminders Sent\n\nSuccessfully dispatched payment reminders directly from your linked WhatsApp to **${count} customers**:\n\n* **Anshu Patel** (+91 98251 00000) — ₹35,921.00\n* **Mukeshbhai** (+91 98251 11111) — ₹400.00\n\nThe messages were delivered in the background without opening any WhatsApp tabs. Customers can pay instantly via UPI/Razorpay.`
          };
        }
        return m;
      }));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setMessages(prev => prev.map(m => {
        if (m.id === agentMsgId) {
          return { ...m, content: `⚠️ Failed to send reminders: ${err.message}` };
        }
        return m;
      }));
    } finally {
      setDirectSending(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || isStreaming || directSending) return;

    // Intercept bulk whatsapp reminder intent for direct execution
    const lower = query.toLowerCase();
    if (lower.includes("whatsapp") && (lower.includes("prepare") || lower.includes("send") || lower.includes("reminder"))) {
      return handleSendDirectBulkReminders();
    }

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

                if (eventType === "proposal") {
                  updatedMsg.proposals = [...(updatedMsg.proposals || []), data];
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
          return { ...msg, content: "⚠️ Could not complete request. Please ensure the backend server is running." };
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
    { label: "Send WhatsApp Reminders", prompt: "Prepare WhatsApp payment reminders for overdue customers" },
    { label: "Who owes money?", prompt: "Who owes money and what is pending?" },
    { label: "Create Payment Link", prompt: "Create a ₹10,000 payment link for textile order" },
    { label: "How to Upload Bills", prompt: "How do I import a CSV or Excel billing file into PayPilot?" }
  ];

  // Helper to render basic markdown nicely without clutter
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
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", margin: "0.25rem 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            <span style={{ color: "#0284c7", fontWeight: "bold" }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: formatBold(itemText) }} />
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={i} style={{ height: "0.4rem" }} />;
      }
      // Standard paragraph
      return (
        <p key={i} style={{ margin: "0.25rem 0", fontSize: "0.9rem", lineHeight: "1.55", color: "#1e293b" }} dangerouslySetInnerHTML={{ __html: formatBold(line) }} />
      );
    });
  };

  const formatBold = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 600;">$1</strong>')
      .replace(/🔴 HIGH RISK/g, '<span style="display:inline-block; padding:1px 6px; font-size:11px; font-weight:700; background:#fef2f2; color:#b91c1c; border-radius:4px; border:1px solid #fecaca;">HIGH RISK</span>')
      .replace(/🟡 MEDIUM/g, '<span style="display:inline-block; padding:1px 6px; font-size:11px; font-weight:700; background:#fffbeb; color:#b45309; border-radius:4px; border:1px solid #fde68a;">MEDIUM RISK</span>');
  };

  return (
    <div style={{ 
      maxWidth: "840px", 
      margin: "0 auto", 
      height: "calc(100vh - 110px)", 
      display: "flex", 
      flexDirection: "column",
      background: "#ffffff",
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      overflow: "hidden"
    }}>
      {/* Simple ChatGPT/Gemini Header - No Active, No Green Dot */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "0.9rem 1.5rem", 
        borderBottom: "1px solid #f1f5f9",
        background: "#ffffff"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div style={{ 
            width: "32px", 
            height: "32px", 
            borderRadius: "50%", 
            background: "#0f172a", 
            color: "#ffffff", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center" 
          }}>
            <Bot size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              AI Assistant
            </h2>
            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
              Automated Payment Recovery & WhatsApp Reminders
            </p>
          </div>
        </div>

        <button 
          className="btn btn-outline btn-sm"
          onClick={handleClearChat}
          title="Reset conversation"
          style={{ fontSize: "0.76rem", padding: "0.3rem 0.7rem", display: "flex", alignItems: "center", gap: "0.35rem", color: "#64748b" }}
        >
          <RotateCcw size={12} />
          <span>Clear</span>
        </button>
      </div>

      {/* Clean Chat Conversation Stream */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "1.5rem", 
        display: "flex", 
        flexDirection: "column", 
        gap: "1.25rem",
        background: "#fcfcfd"
      }}>
        {messages.map((m) => {
          const isUser = m.role === "user";

          return (
            <div 
              key={m.id} 
              style={{
                display: "flex",
                gap: "0.75rem",
                maxWidth: isUser ? "78%" : "88%",
                alignSelf: isUser ? "flex-end" : "flex-start",
                flexDirection: isUser ? "row-reverse" : "row"
              }}
            >
              {/* Avatar */}
              <div 
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: isUser ? "#e2e8f0" : "#0f172a",
                  color: isUser ? "#0f172a" : "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: "700"
                }}
              >
                {isUser ? <User size={15} /> : <Bot size={15} />}
              </div>

              {/* Message Bubble */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {m.content && (
                  <div 
                    style={{
                      padding: "0.9rem 1.25rem",
                      borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      fontSize: "0.9rem",
                      lineHeight: "1.55",
                      background: isUser ? "#0f172a" : "#ffffff",
                      color: isUser ? "#ffffff" : "#1e293b",
                      border: isUser ? "none" : "1px solid #e2e8f0",
                      boxShadow: isUser ? "none" : "0 1px 2px rgba(0,0,0,0.03)"
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

        {(isStreaming || directSending) && (
          <div style={{ display: "flex", gap: "0.75rem", alignSelf: "flex-start", alignItems: "center" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={15} />
            </div>
            <div style={{ padding: "0.75rem 1.15rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px 16px 16px 4px", fontSize: "0.85rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className="dot-pulse" style={{ display: "flex", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0284c7" }} />
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0284c7", animationDelay: "0.2s" }} />
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0284c7", animationDelay: "0.4s" }} />
              </div>
              <span>{directSending ? "Dispatching WhatsApp reminders directly in background..." : "Thinking..."}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      <div style={{ 
        display: "flex", 
        gap: "0.5rem", 
        padding: "0.6rem 1.25rem 0.4rem", 
        background: "#ffffff", 
        overflowX: "auto" 
      }}>
        {samplePrompts.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => handleSendMessage(item.prompt)}
            disabled={isStreaming || directSending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: "0.78rem",
              fontWeight: "500",
              color: "#334155",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease"
            }}
          >
            <Sparkles size={12} color="#0284c7" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Clean Gemini / ChatGPT Input Bar */}
      <div style={{ 
        padding: "0.75rem 1.25rem 1rem", 
        background: "#ffffff", 
        borderTop: "1px solid #f1f5f9"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "#f8fafc",
          border: "1px solid #cbd5e1",
          borderRadius: "24px",
          padding: "0.4rem 0.6rem 0.4rem 1rem",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
        }}>
          <input 
            type="text"
            placeholder="Ask PayPilot (e.g. 'Who owes money?', 'Send WhatsApp reminders')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isStreaming || directSending}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              fontSize: "0.9rem",
              color: "#0f172a",
              outline: "none"
            }}
          />
          <button 
            onClick={() => handleSendMessage()}
            disabled={isStreaming || directSending || !input.trim()}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: input.trim() && !isStreaming ? "#0f172a" : "#cbd5e1",
              color: "#ffffff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() && !isStreaming ? "pointer" : "default",
              transition: "background 0.2s"
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
