import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_QUESTIONS = [
  { icon: "🔴", text: "Can humans ever live on Mars?" },
  { icon: "💍", text: "What are Saturn's rings made of?" },
  { icon: "🌊", text: "Which planets might have liquid water?" },
  { icon: "💨", text: "Why is Neptune so windy?" },
  { icon: "🔥", text: "Why is Venus hotter than Mercury?" },
  { icon: "🌙", text: "Which planet has the most moons?" },
];

const WELCOME = {
  role: "assistant",
  content: "Hello, explorer! 🌌 I'm CosmosAI — your personal guide to the solar system. Ask me anything about planets, moons, or the cosmos, or pick a question below to get started!",
  id: 0,
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, hasOpened]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = { role: "user", content: trimmed, id: Date.now() };
    const aiMsgId = Date.now() + 1;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { role: "assistant", content: "", id: aiMsgId, streaming: true },
    ]);
    setInput("");
    setIsStreaming(true);

    // Build API messages (no UI-only fields, skip empty assistant msg)
    const apiMessages = [...messages, userMsg]
      .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: m.content + parsed.text } : m
                )
              );
            }
            if (parsed.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, content: "⚠️ " + parsed.error, streaming: false }
                    : m
                )
              );
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: "⚠️ Connection error. Make sure the server is running.", streaming: false }
            : m
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, streaming: false } : m))
      );
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([
      { ...WELCOME, content: "Chat cleared! 🌌 Ready for your next cosmic question.", id: Date.now() },
    ]);
  };

  const userMsgCount = messages.filter((m) => m.role === "user").length;

  return (
    <>
      {/* FAB Button */}
      <motion.button
        className="chatbot-fab"
        onClick={() => setIsOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 260, damping: 20 }}
        aria-label="Open CosmosAI chat"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              ✕
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              🌌
            </motion.span>
          )}
        </AnimatePresence>
        {!isOpen && userMsgCount > 0 && (
          <span className="chatbot-badge">{userMsgCount}</span>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-panel"
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-title-block">
                <div className="chatbot-avatar">🤖</div>
                <div>
                  <h3 className="chatbot-name">CosmosAI</h3>
                  <span className="chatbot-status">
                    <span className={`status-dot ${isStreaming ? "streaming" : ""}`} />
                    {isStreaming ? "Thinking…" : "Online"}
                  </span>
                </div>
              </div>
              <button className="chatbot-clear-btn" onClick={clearChat} title="Clear chat">
                Clear
              </button>
            </div>

            {/* Messages */}
            <div className="chatbot-messages">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`chat-msg ${msg.role}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.role === "assistant" && (
                    <div className="msg-avatar-icon">🤖</div>
                  )}
                  <div className="msg-bubble">
                    {msg.streaming && !msg.content ? (
                      <span className="typing-dots">
                        <span /><span /><span />
                      </span>
                    ) : (
                      <>
                        {msg.content}
                        {msg.streaming && <span className="stream-cursor" />}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            <AnimatePresence>
              {userMsgCount === 0 && !isStreaming && (
                <motion.div
                  className="quick-questions-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      className="quick-q-btn"
                      onClick={() => sendMessage(q.text)}
                    >
                      <span className="q-icon">{q.icon}</span>
                      <span>{q.text}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="chatbot-input-row">
              <input
                ref={inputRef}
                className="chatbot-input"
                placeholder="Ask about any planet or phenomenon…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                maxLength={500}
              />
              <button
                className="chatbot-send-btn"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                aria-label="Send message"
              >
                {isStreaming ? (
                  <span className="send-spinner" />
                ) : (
                  <span>↑</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
