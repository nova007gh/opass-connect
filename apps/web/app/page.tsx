'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import ConnectGlyph from '../components/ConnectGlyph';

const slides = [
  {
    title: 'Welcome to OPASS CONNECT',
    desc: 'The official alumni app for OPASS. Connect, engage and make an impact together.',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    accent: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)',
  },
  {
    title: 'Find Classmates',
    desc: 'Search alumni by year group, house, profession and location. Reconnect with old friends instantly.',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    accent: 'linear-gradient(135deg, #0051FF 0%, #10B981 100%)',
  },
  {
    title: 'Join Events & Connect',
    desc: 'Attend live town halls, reunions, and support school projects that make a difference.',
    icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
    accent: 'linear-gradient(135deg, #10B981 0%, #F59E0B 100%)',
  },
  {
    title: 'Mamaa AI Assistant',
    desc: 'Get instant help from our AI assistant. Ask questions, get updates, and stay informed 24/7.',
    icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z',
    accent: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  },
];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  if (showSplash && !user) {
    return (
      <div className="splash-screen">
        <img src="/opass-crest.jpeg" alt="OPASS Crest" className="crest" style={{ mixBlendMode: 'screen' }} />
        <div className="logo-text">OPASS C<span className="c-link"><ConnectGlyph /></span>NNECT</div>
        <div className="sub">OFORI PANIN SENIOR HIGH SCHOOL</div>
        <div className="tagline">One School. One Network. One Legacy.</div>
        <div className="splash-loader">
          <svg viewBox="0 0 50 50" style={{ animation: 'spin 1s linear infinite' }}>
            <circle className="splash-loader-track" cx="25" cy="25" r="20" />
            <circle className="splash-loader-bar" cx="25" cy="25" r="20" />
          </svg>
        </div>
        <div style={{ marginTop: 'auto', marginBottom: 44, opacity: 0.9, fontSize: 14, fontWeight: 500 }}>Connecting OPASS Alumni Worldwide...</div>
        <img src="/opass-school-entrance.jpeg" alt="OPASS Gate" className="gate" />
      </div>
    );
  }

  if (step < slides.length && !user) {
    const slide = slides[step];
    return (
      <div className="onboarding-screen">
        <div className="onboarding-top">
          <Link href="/login" className="onboarding-skip">Skip</Link>
        </div>
        <div className="onboarding-body">
          <img src="/opass-crest.jpeg" alt="OPASS" className="crest" />
          <div className="logo-text">OPASS C<span className="c-link"><ConnectGlyph /></span>NNECT</div>
          <div className="sub">OFORI PANIN SENIOR HIGH SCHOOL</div>
          <div className="onboarding-icon-wrap" style={{ background: slide.accent }}>
            <svg fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5} style={{ width: 48, height: 48 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d={slide.icon} />
            </svg>
          </div>
          <h1>{slide.title}</h1>
          <p>{slide.desc}</p>
        </div>
        <div className="step-dots">
          {slides.map((_, i) => <div key={i} className={`step-dot ${i === step ? 'active' : ''}`} />)}
        </div>
        <div className="onboarding-bottom">
          <button className="btn btn-block" onClick={() => setStep(s => s + 1)}>
            {step === slides.length - 1 ? 'Get Started' : 'Next'}
          </button>
          {step === 0 && (
            <div className="switch mt-16">
              Already have an account? <Link href="/login">Sign in</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-body" style={{ justifyContent: 'center' }}>
        <img src="/opass-crest.jpeg" alt="OPASS" className="crest" />
        <div className="logo-text" style={{ marginBottom: 8 }}>OPASS C<span className="c-link"><ConnectGlyph /></span>NNECT</div>
        <div className="sub" style={{ marginBottom: 28 }}>OFORI PANIN SENIOR HIGH SCHOOL</div>
        <h1>Ready to connect?</h1>
        <p style={{ marginBottom: 32 }}>Join thousands of OPASS alumni building a stronger legacy.</p>
        <Link className="btn btn-block" href="/register">Create an account</Link>
        <Link className="btn btn-block btn-white" style={{ marginTop: 12, color: 'var(--blue)', border: '1px solid var(--border)' }} href="/login">I already have an account</Link>
      </div>
    </div>
  );
}
