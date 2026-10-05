import { useState, useRef, useEffect } from 'react';
import { assistant } from '../api';
import { useAuthStore } from '../store/auth';
import { Send, Bot, User, BarChart2, Globe } from 'lucide-react';
import styles from './Assistant.module.css';

const SUGGESTION_GROUPS = [
  {
    label: '📊 Your Business',
    icon: BarChart2,
    items: [
      "What are my biggest risks?",
      "Which products need restocking?",
      "What are my best-selling products?",
      "How are my sales performing?",
      "What should I focus on today?",
      "Which products have declining sales?",
    ],
  },
  {
    label: '💻 Technology',
    icon: Globe,
    items: [
      "What is artificial intelligence?",
      "What is machine learning?",
      "Explain blockchain",
      "What is the best programming language?",
      "What is ChatGPT?",
      "What is cloud computing?",
    ],
  },
  {
    label: '💼 Business & Finance',
    icon: Globe,
    items: [
      "What is ROI?",
      "Explain compound interest",
      "What is cash flow?",
      "How to start a business?",
      "What is the stock market?",
      "What are KPIs?",
    ],
  },
  {
    label: '🌍 General Knowledge',
    icon: Globe,
    items: [
      "Tell me something interesting",
      "Tell me a joke",
      "What is climate change?",
      "How to be more productive?",
      "How to reduce stress?",
      "What is the meaning of life?",
    ],
  },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

function formatMessage(text: string) {
  // Convert **bold** and newlines for display
  const parts = text.split('\n');
  return parts.map((line, i) => {
    const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} style={{ margin: '2px 0' }} />;
  });
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hi! 👋 I'm **Operix Assistant**.\n\nI can help with two things:\n• 📊 **Your business data** — risks, sales, inventory, forecasts\n• 🌐 **General questions** — tech, finance, science, health, and more\n\nWhat would you like to know?",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { business } = useAuthStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const r = await assistant.chat(text.trim());
      const botMsg: Message = {
        role: 'assistant',
        content: r.data.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {business?.is_demo && <div className="demo-banner">⚡ Viewing demo data — the assistant uses your actual loaded data</div>}
      <div style={{ marginBottom: 16 }}>
        <h1 className="section-title">Operix Assistant</h1>
        <p className="section-subtitle">Ask about your business or anything else — tech, finance, science, and more</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.chatPanel}>
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.msg} ${msg.role === 'user' ? styles.userMsg : styles.botMsg}`}>
                <div className={styles.msgAvatar}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={styles.msgContent}>
                  <div className={styles.msgBubble}>
                    {formatMessage(msg.content)}
                  </div>
                  <div className={styles.msgTime}>{msg.time}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.botMsg}`}>
                <div className={styles.msgAvatar}><Bot size={14} /></div>
                <div className={styles.msgContent}>
                  <div className={styles.msgBubble}>
                    <div className={styles.typing}>
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={styles.inputArea}>
            <input
              className={styles.chatInput}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask anything — business data or general questions…"
              disabled={loading}
            />
            <button className={styles.sendBtn} onClick={() => send(input)} disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>

        <div className={styles.sidePanel}>
          {/* Category tabs */}
          <div className={styles.groupTabs}>
            {SUGGESTION_GROUPS.map((g, i) => (
              <button
                key={g.label}
                className={`${styles.groupTab} ${activeGroup === i ? styles.groupTabActive : ''}`}
                onClick={() => setActiveGroup(i)}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Questions for active group */}
          <div className={styles.suggestionList}>
            {SUGGESTION_GROUPS[activeGroup].items.map(s => (
              <button key={s} className={styles.suggestion} onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
