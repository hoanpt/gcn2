'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const FAQS = [
  {
    q: 'Giá tiêm vắc xin tại CDC Đà Nẵng?',
    a: 'Bảng giá vắc xin được niêm yết công khai tại Trung tâm CDC Đà Nẵng theo quy định. Quý khách vui lòng liên hệ bộ phận Tiêm chủng hoặc SĐT: 0236.3890412 để cập nhật giá chi tiết từng loại vắc xin.'
  },
  {
    q: 'Lịch làm việc của CDC Đà Nẵng?',
    a: 'CDC Đà Nẵng làm việc từ Thứ 2 đến Thứ 6:\n• Sáng: 07h30 - 11h30\n• Chiều: 13h30 - 17h00\n(Thứ 7, Chủ nhật nghỉ; Trực cấp cứu & phòng chống dịch 24/7).\nĐịa chỉ: 118 Lê Đình Lý, Thanh Khê, Đà Nẵng.'
  },
  {
    q: 'Giấy chứng nhận tiêm chủng quốc tế là gì?',
    a: 'Là giấy chứng nhận xác nhận một người đã được tiêm các loại vắc xin theo yêu cầu của Quy định Y tế quốc tế (IHR) hoặc quy định nhập cảnh của từng quốc gia.'
  },
  {
    q: 'Những loại vắc xin nào được cấp giấy chứng nhận quốc tế?',
    a: 'Tùy theo quy định hiện hành và quốc gia đến, phổ biến gồm: vắc xin Sởi, Quai bị, Rubella, Thủy đậu, Não mô cầu, Bạch hầu, Ho gà, Uốn ván, Viêm gan A, Viêm gan B, Tả, Cúm mùa, Viêm脑 Nhật Bản, Thương hàn và một số vắc xin khác theo quy định.'
  },
  {
    q: 'Cần mang theo giấy tờ gì khi làm chứng nhận?',
    a: 'Thông thường cần mang theo:\n1. Căn cước công dân / Hộ chiếu (bản gốc còn hạn).\n2. Sổ tiêm chủng hoặc Giấy xác nhận đã tiêm vắc xin hợp lệ.\n3. Ảnh chụp/mã biên lai thanh toán lệ phí (85.000đ/hồ sơ).'
  },
  {
    q: 'Có thể cấp giấy nếu đã tiêm ở nơi khác không?',
    a: 'Có thể, nếu người dân cung cấp được bằng chứng tiêm chủng hợp lệ để cơ sở kiểm tra, đối chiếu theo quy định.'
  },
  {
    q: 'Bao lâu thì được cấp giấy chứng nhận?',
    a: 'Tối thiểu trong vòng 02 ngày làm việc (thời gian xử lý dự kiến 3–5 ngày làm việc) và phụ thuộc vào việc xác minh thông tin tiêm chủng của cá nhân.'
  },
  {
    q: 'Chi phí cấp giấy chứng nhận là bao nhiêu?',
    a: 'Lệ phí cấp Giấy chứng nhận tiêm chủng quốc tế là 85.000 VNĐ / hồ sơ.'
  },
  {
    q: 'Mất giấy chứng nhận thì làm thế nào?',
    a: 'Người dân liên hệ trực tiếp cơ sở đã cấp giấy (CDC Đà Nẵng) để được hướng dẫn cấp lại hoặc xác minh thông tin theo quy định.'
  },
  {
    q: 'Cách phòng ngừa sốt xuất huyết?',
    a: '• Diệt lăng quăng, bọ gậy, đậy kín các dụng cụ chứa nước.\n• Ngủ mùng/màn kể cả ban ngày, mặc quần áo dài tay.\n• Dùng kem/xịt chống muỗi.\n• Phối hợp với ngành y tế khi có phun hóa chất diệt muỗi.'
  },
  {
    q: 'Xét nghiệm HIV ở đâu tại Đà Nẵng?',
    a: 'Bạn có thể đến Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng (118 Lê Đình Lý, Q. Thanh Khê) hoặc các Trung tâm Y tế quận/huyện trên địa bàn để được tư vấn và xét nghiệm bảo mật.'
  }
];

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý AI của CDC Đà Nẵng. Tôi có thể giúp gì cho bạn hôm nay?',
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

    // Process answer
    setTimeout(() => {
      const replyText = findAnswer(query);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: replyText,
        time: getCurrentTime()
      };
      setMessages(prev => [...prev, botMsg]);
    }, 400);
  }

  function findAnswer(query) {
    const qLower = query.toLowerCase();

    // Matching logic
    for (const faq of FAQS) {
      const faqQLower = faq.q.toLowerCase();
      // Match key phrases
      if (qLower.includes('giá') || qLower.includes('bao nhiêu tiền') || qLower.includes('lệ phí') || qLower.includes('chi phí')) {
        if (qLower.includes('tiêm') || qLower.includes('vắc xin') || qLower.includes('vacxin')) return FAQS[0].a;
        if (qLower.includes('giấy') || qLower.includes('chứng nhận') || qLower.includes('hồ sơ')) return FAQS[7].a;
      }
      if (qLower.includes('lịch') || qLower.includes('giờ làm việc') || qLower.includes('mở cửa') || qLower.includes('địa chỉ')) {
        return FAQS[1].a;
      }
      if (qLower.includes('giấy chứng nhận tiêm chủng quốc tế là gì')) {
        return FAQS[2].a;
      }
      if (qLower.includes('loại vắc xin') || qLower.includes('vắc xin nào')) {
        return FAQS[3].a;
      }
      if (qLower.includes('giấy tờ') || qLower.includes('mang theo') || qLower.includes('thủ tục')) {
        return FAQS[4].a;
      }
      if (qLower.includes('nơi khác') || qLower.includes('tiêm ở đâu')) {
        return FAQS[5].a;
      }
      if (qLower.includes('bao lâu') || qLower.includes('mấy ngày') || qLower.includes('thời gian')) {
        return FAQS[6].a;
      }
      if (qLower.includes('mất') || qLower.includes('làm lại') || qLower.includes('cấp lại')) {
        return FAQS[8].a;
      }
      if (qLower.includes('sốt xuất huyết') || qLower.includes('muỗi')) {
        return FAQS[9].a;
      }
      if (qLower.includes('hiv') || qLower.includes('xét nghiệm')) {
        return FAQS[10].a;
      }

      // Check substring matches
      const keywords = faq.q.replace(/[\?\.\,]/g, '').split(' ');
      const matchCount = keywords.filter(kw => kw.length > 2 && qLower.includes(kw.toLowerCase())).length;
      if (matchCount >= 2) {
        return faq.a;
      }
    }

    // Fallback response
    return 'Cảm ơn câu hỏi của bạn. Về vấn đề này, bạn có thể liên hệ trực tiếp CDC Đà Nẵng qua SĐT: 0236.3890412 hoặc đến bộ phận Một cửa tại địa chỉ: 118 Lê Đình Lý, Thanh Khê, Đà Nẵng để được hỗ trợ chính xác nhất.';
  }

  function clearHistory() {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: 'Xin chào! Tôi là Trợ lý AI của CDC Đà Nẵng. Tôi có thể giúp gì cho bạn hôm nay?',
        time: getCurrentTime()
      }
    ]);
  }

  return (
    <div className="ai-chatbot-root">
      {/* Floating Widget Box */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-avatar-wrapper">
                <div className="ai-avatar-icon">🤖</div>
                <span className="ai-status-dot" />
              </div>
              <div>
                <h4>Trợ lý AI CDC Đà Nẵng</h4>
                <p>Hỗ trợ thông tin y tế</p>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button title="Xóa lịch sử chat" onClick={clearHistory} className="ai-action-btn">
                <i className="fa-regular fa-trash-can" />
              </button>
              <button title="Đóng" onClick={() => setIsOpen(false)} className="ai-action-btn">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-chat-body">
            {messages.map((m, idx) => (
              <div key={m.id} className={`ai-msg-group ${m.sender === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}`}>
                {m.sender === 'bot' && (
                  <div className="ai-msg-avatar">🤖</div>
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

            {/* Quick Suggestions Chips */}
            {messages.length <= 3 && (
              <div className="ai-quick-suggestions">
                {FAQS.slice(0, 4).map((faq, i) => (
                  <button
                    key={i}
                    className="ai-suggestion-chip"
                    onClick={() => handleSend(faq.q)}
                  >
                    {faq.q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
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

      {/* Floating Toggle Button */}
      <button
        className={`ai-chat-toggle-btn ${isOpen ? 'ai-toggle-open' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-comments'}`} />
        <span>Hỏi đáp AI</span>
      </button>
    </div>
  );
}
