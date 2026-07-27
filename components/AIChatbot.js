'use client';
import { useState } from 'react';
import { FAQ_ITEMS } from '@/lib/faqData';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(1); // Mặc định mở câu 1

  function toggleFaq(id) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  const filteredFaqs = FAQ_ITEMS.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
  });

  return (
    <div className="ai-chatbot-root">
      {/* Cửa sổ Popup FAQ */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-avatar-wrapper">
                <i className="fa-solid fa-circle-question" style={{ fontSize: 22 }} />
              </div>
              <div>
                <h4>Câu Hỏi Thường Gặp</h4>
                <p>CDC Đà Nẵng — Giải đáp thắc mắc</p>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button 
                title="Thu gọn tất cả" 
                onClick={() => { setExpandedId(null); setSearchQuery(''); }} 
                className="ai-action-btn"
              >
                <i className="fa-solid fa-rotate-left" />
              </button>
              <button title="Đóng" onClick={() => setIsOpen(false)} className="ai-action-btn">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          {/* Thanh Tìm Kiếm */}
          <div className="faq-search-bar">
            <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--gray-400)' }} />
            <input
              type="text"
              className="faq-search-input"
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="faq-search-clear" onClick={() => setSearchQuery('')}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Danh sách 11 Câu hỏi (Hiện câu trả lời ngay bên dưới) */}
          <div className="ai-chat-body" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 8, textTransform: 'uppercase' }}>
              Danh sách 11 câu hỏi thường gặp ({filteredFaqs.length}):
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 10px' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 24, opacity: 0.4, marginBottom: 8 }} />
                <p style={{ fontSize: 13 }}>Không tìm thấy câu hỏi phù hợp với "{searchQuery}"</p>
              </div>
            ) : (
              <div className="faq-accordion-list">
                {filteredFaqs.map((item) => {
                  const isExpanded = expandedId === item.id || (searchQuery.trim().length > 0);
                  return (
                    <div key={item.id} className={`faq-widget-card ${isExpanded ? 'faq-expanded' : ''}`}>
                      <button
                        className="faq-widget-question"
                        onClick={() => toggleFaq(item.id)}
                      >
                        <span className="faq-widget-q-title">
                          <span className="faq-num-badge">{item.id}</span>
                          {item.q}
                        </span>
                        <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} faq-chevron`} />
                      </button>

                      {/* Câu trả lời hiện ngay bên dưới câu hỏi */}
                      {isExpanded && (
                        <div className="faq-widget-answer">
                          <div className="faq-answer-content">
                            <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)', marginTop: 3, flexShrink: 0 }} />
                            <div>{item.a}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer liên hệ hỗ trợ */}
          <div className="ai-chat-footer" style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Cần hỗ trợ thêm? Gọi CDC Đà Nẵng: <a href="tel:02363890412" style={{ fontWeight: 700, color: 'var(--primary)' }}>0236.3890412</a>
            </span>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
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
