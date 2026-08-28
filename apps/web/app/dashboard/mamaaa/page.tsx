'use client';

import { useState, useRef, useEffect } from 'react';
import { apiPost } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

interface ChatMsg { role: 'user' | 'assistant'; content: string }

const quickActions = [
  'How do I pay my dues?',
  'Tell me about upcoming events',
  'Who is leading the election?',
  'Tell me about active projects',
  'How can I join a year group?',
  'Tell me a school joke!',
];

export default function MamaaaPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: `Akwaaba${user?.profile?.fullName ? ', ' + user.profile.fullName.split(' ')[0] : ''}! I am Mr. Atsu Clements, affectionately known as Mamaaa — your OPASS CONNECT AI assistant. I know everything about our platform — events, elections, projects, year groups, and more. I also love a good math problem! How can I help you today?` },
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'chat' | 'quote'>('chat');
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Quote form
  const [quoteForm, setQuoteForm] = useState({
    clientName: user?.profile?.fullName || '', clientEmail: user?.email || '', clientPhone: user?.phone || '',
    requestType: 'advertising', durationDays: '7', placement: 'year_group',
    audienceSize: '1000', creativeType: 'image', rush: false,
  });
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const userMsg = text?.trim() || input.trim();
    if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const data = await apiPost<{ conversationId: string; message: string }>('/ai/chat', {
        message: userMsg,
        conversationId,
      });
      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: any) => setQuoteForm(f => ({ ...f, [k]: v }));

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteLoading(true);
    setQuoteError('');
    setQuoteResult(null);
    try {
      const data = await apiPost('/ai/quote', {
        clientName: quoteForm.clientName,
        clientEmail: quoteForm.clientEmail,
        clientPhone: quoteForm.clientPhone || undefined,
        request: {
          requestType: quoteForm.requestType,
          durationDays: parseInt(quoteForm.durationDays, 10),
          placement: quoteForm.placement,
          audienceSize: parseInt(quoteForm.audienceSize, 10),
          creativeType: quoteForm.creativeType,
          rush: quoteForm.rush,
        },
      });
      setQuoteResult(data);
    } catch (err: any) {
      setQuoteError(err.message || 'Quote request failed');
    } finally {
      setQuoteLoading(false);
    }
  };

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 18, flexShrink: 0, boxShadow: '0 2px 8px rgba(11,45,107,0.3)' }}>M</div>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Mr. Atsu (Mamaaa)</h1>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} /> Online
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <button onClick={() => setTab('chat')} style={{
          flex: 1, borderRadius: 0, background: 'transparent',
          color: tab === 'chat' ? 'var(--blue)' : 'var(--muted)',
          borderBottom: tab === 'chat' ? '2px solid var(--blue-bright)' : '2px solid transparent',
          fontSize: 14, padding: '14px', fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>Chat</button>
        <button onClick={() => setTab('quote')} style={{
          flex: 1, borderRadius: 0, background: 'transparent',
          color: tab === 'quote' ? 'var(--blue)' : 'var(--muted)',
          borderBottom: tab === 'quote' ? '2px solid var(--blue-bright)' : '2px solid transparent',
          fontSize: 14, padding: '14px', fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>Quote</button>
      </div>

      {tab === 'chat' ? (
        <>
          <div className="app-scroll" style={{ flex: 1, padding: '16px 16px 8px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 16, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'assistant' && (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 14, flexShrink: 0, boxShadow: '0 2px 6px rgba(11,45,107,0.2)' }}>M</div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '14px 18px',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.role === 'user' ? 'var(--blue)' : 'var(--white)',
                  color: m.role === 'user' ? 'white' : 'var(--black)',
                  fontSize: 15,
                  lineHeight: 1.5,
                  boxShadow: 'var(--shadow-sm)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>M</div>
                <div style={{ padding: '14px 18px', borderRadius: '18px 18px 18px 4px', background: 'var(--white)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted)', animation: 'bounce 1.4s infinite', opacity: 0.4 }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted)', animation: 'bounce 1.4s infinite 0.2s', opacity: 0.4 }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted)', animation: 'bounce 1.4s infinite 0.4s', opacity: 0.4 }} />
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
            {!loading && messages.length <= 2 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {quickActions.map(q => (
                  <button key={q} onClick={() => send(q)} style={{
                    padding: '8px 14px', borderRadius: 999, background: 'var(--white)',
                    border: '1px solid var(--border)', fontSize: 12, color: 'var(--blue)',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: '12px 16px calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--border)', background: 'var(--white)', display: 'flex', gap: 10, position: 'sticky', bottom: 0 }}>
            <input
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message to Mamaaa..."
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={loading}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button className="btn" onClick={() => send()} disabled={loading || !input.trim()} style={{ minHeight: 48, padding: '0 20px' }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </button>
          </div>
        </>
      ) : (
        <div className="app-scroll">
          <div className="app-pad">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 20, borderBottom: '1px solid var(--border)', background: 'var(--blue-50)' }}>
                <h3 style={{ margin: 0, color: 'var(--blue)' }}>Quote Estimate</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>Tell us what you need and Mamaaa will generate an estimate.</p>
              </div>
              <form onSubmit={submitQuote} style={{ padding: 20 }}>
                {quoteError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{quoteError}</div>}
                <div className="form-group">
                  <label>Your name *</label>
                  <div className="input-wrap">
                    <input type="text" value={quoteForm.clientName} onChange={e => set('clientName', e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <div className="input-wrap">
                    <input type="email" value={quoteForm.clientEmail} onChange={e => set('clientEmail', e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <div className="input-wrap">
                    <input type="tel" value={quoteForm.clientPhone} onChange={e => set('clientPhone', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>What type of service are you interested in?</label>
                  <div className="grid-2" style={{ gap: 10 }}>
                    {['advertising', 'sponsorship', 'event', 'partnership', 'other'].map(t => (
                      <button key={t} type="button" onClick={() => set('requestType', t)} className={quoteForm.requestType === t ? 'btn btn-sm' : 'btn btn-sm btn-outline'} style={{ textTransform: 'capitalize' }}>
                        {t.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Duration (days)</label>
                    <div className="input-wrap">
                      <input type="number" value={quoteForm.durationDays} onChange={e => set('durationDays', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Audience size</label>
                    <div className="input-wrap">
                      <input type="number" value={quoteForm.audienceSize} onChange={e => set('audienceSize', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Rush</label>
                    <select className="select" value={quoteForm.rush ? 'yes' : 'no'} onChange={e => set('rush', e.target.value === 'yes')} style={{ width: '100%' }}>
                      <option value="no">No</option>
                      <option value="yes">Yes (+20%)</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Placement</label>
                    <select className="select" value={quoteForm.placement} onChange={e => set('placement', e.target.value)} style={{ width: '100%' }}>
                      <option value="year_group">Year group</option>
                      <option value="home">Home page</option>
                      <option value="events">Events page</option>
                      <option value="platform_wide">Platform-wide</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Creative type</label>
                    <select className="select" value={quoteForm.creativeType} onChange={e => set('creativeType', e.target.value)} style={{ width: '100%' }}>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="live">Live session</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-block" type="submit" disabled={quoteLoading}>
                  {quoteLoading ? <span className="spinner" /> : 'Generate Quote'}
                </button>
              </form>

              {quoteResult && (
                <div className="card" style={{ margin: 20, marginTop: 0, background: 'var(--blue-50)', borderColor: 'var(--blue-100)' }}>
                  {quoteResult.ready ? (
                    <>
                      <h3 style={{ color: 'var(--blue)', margin: '0 0 8px' }}>Quote {quoteResult.quote?.quoteNumber ?? '—'}</h3>
                      <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>Estimated total</p>
                      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue)', marginBottom: 8 }}>GHS {Number(quoteResult.quote?.total ?? 0).toLocaleString()}</div>
                      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>Subtotal: GHS {Number(quoteResult.quote?.subtotal ?? 0).toLocaleString()}</div>
                      <div className="text-sm text-muted mb-16" style={{ marginBottom: 8 }}>Valid until {quoteResult.quote?.expiresAt ? new Date(quoteResult.quote.expiresAt).toLocaleDateString() : '—'}</div>
                      <div className="alert alert-warning">{quoteResult.notice}</div>
                    </>
                  ) : (
                    <>
                      <h3 style={{ color: 'var(--blue)', margin: '0 0 8px' }}>More information needed</h3>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>{Array.isArray(quoteResult.questions) ? quoteResult.questions.map((q: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{q}</li>) : null}</ul>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
