'use client';
import { useState, useRef, useEffect } from 'react';
import { FAQ_ITEMS } from '@/lib/faqData';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Bạn có thể chọn danh sách các Câu hỏi thường gặp bên dưới hoặc nhập từ khóa để tìm câu trả lời nhanh chóng.',
      time: getCurrentTime()
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function getCurrentTime() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function handleSend(textToSend) {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: getCurrentTime()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');

    setTimeout(() => {
      const replyText = findAnswer(query);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: replyText,
        time: getCurrentTime()
      };
      setMessages(prev => [...prev, botMsg]);
    }, 300);
  }

  function findAnswer(query) {
    const qLower = query.toLowerCase();

    // 1. Direct match with exact 11 FAQ items
    for (const item of FAQ_ITEMS) {
      if (item.q.toLowerCase() === qLower) {
        return item.a;
      }
    }

    // 2. Keyword match against 11 FAQs
    let bestMatch = null;
    let maxScore = 0;

    for (const item of FAQ_ITEMS) {
      const words = item.q.toLowerCase().replace(/[\?\.\,]/g, '').split(/\s+/);
      let score = 0;
      words.forEach(w => {
        if (w.length > 2 && qLower.includes(w)) {
          score++;
        }
      });

      if (qLower.includes('giá') || qLower.includes('chi phí') || qLower.includes('lệ phí') || qLower.includes('tiền')) {
        if (item.id === 9) score += 5;
      }
      if (qLower.includes('ở đâu') || qLower.includes('địa điểm') || qLower.includes('địa chỉ')) {
        if (item.id === 3) score += 5;
      }
      if (qLower.includes('giấy tờ') || qLower.includes('mang theo') || qLower.includes('thủ tục')) {
        if (item.id === 4) score += 5;
      }
      if (qLower.includes('bao lâu') || qLower.includes('mấy ngày') || qLower.includes('khi nào')) {
        if (item.id === 6) score += 5;
      }
      if (qLower.includes('nơi khác') || qLower.includes('đã tiêm ở')) {
        if (item.id === 5) score += 5;
      }
      if (qLower.includes('thời hạn') || qLower.includes('hạn sử dụng')) {
        if (item.id === 7) score += 5;
      }
      if (qLower.includes('mất') || qLower.includes('cấp lại')) {
        if (item.id === 8) score += 5;
      }
      if (qLower.includes('nước nào') || qLower.includes('xuất cảnh') || qLower.includes('du học')) {
        if (item.id === 10) score += 5;
      }
      if (qLower.includes('chưa tiêm')) {
        if (item.id === 11) score += 5;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && maxScore > 0) {
      return bestMatch.a;
    }

    return 'Trường hợp thắc mắc của bạn chưa có trong danh mục FAQ, vui lòng liên hệ trực tiếp CDC Đà Nẵng qua Hotline: 0236.3890412 hoặc đến bộ phận Một cửa tại 118 Lê Đình Lý, Thanh Khê, Đà Nẵng để được giải đáp chi tiết.';
  }

  function clearHistory() {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: 'Xin chào! Bạn có thể chọn danh sách các Câu hỏi thường gặp bên dưới hoặc nhập từ khóa để tìm câu trả lời nhanh chóng.',
        time: getCurrentTime()
      }
    ]);
  }

  return (
    <div className="ai-chatbot-root">
      {/* Chat Box Popup */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-avatar-wrapper">
                <i className="fa-solid fa-circle-question" style={{ fontSize: 22 }} />
                <span className="ai-status-dot" />
              </div>
              <div>
                <h4>Câu Hỏi Thường Gặp</h4>
                <p>CDC Đà Nẵng — Giải đáp thắc mắc</p>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button title="Làm mới chat" onClick={clearHistory} className="ai-action-btn">
                <i className="fa-regular fa-trash-can" />
              </button>
              <button title="Đóng" onClick={() => setIsOpen(false)} className="ai-action-btn">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="ai-chat-body">
            {messages.map(m => (
              <div key={m.id} className={`ai-msg-group ${m.sender === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}`}>
                {m.sender === 'bot' && (
                  <div className="ai-msg-avatar">
                    <i className="fa-solid fa-hospital-user" style={{ fontSize: 14, color: 'var(--primary)' }} />
                  </div>
                )}
                <div className="ai-msg-content">
                  <div className="ai-msg-bubble">
                    {m.text.split('\n').map((line, i) => (
                      <span key={i}>{line}<br /></span>
                    ))}
                  </div>
                  <span className="ai-msg-time">{m.time}</span>
                </div>
              </div>
            ))}

            {/* List of 11 FAQs */}
            <div className="ai-quick-suggestions">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', margin: '4px 0 2px', textTransform: 'uppercase' }}>
                Danh sách 11 câu hỏi thường gặp:
              </div>
              {FAQ_ITEMS.map(item => (
                <button
                  key={item.id}
                  className="ai-suggestion-chip"
                  onClick={() => handleSend(item.q)}
                >
                  <i className="fa-regular fa-circle-question" style={{ marginRight: 6, color: 'var(--primary)' }} />
                  {item.q}
                </button>
              ))}
            </div>

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="ai-chat-footer">
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Nhập câu hỏi... (Enter để gửi)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button
              className="ai-chat-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim()}
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        className={`ai-chat-toggle-btn ${isOpen ? 'ai-toggle-open' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-circle-question'}`} />
        <span>Câu hỏi thường gặp</span>
      </button>
    </div>
  );
}
