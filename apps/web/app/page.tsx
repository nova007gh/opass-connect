'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import ConnectGlyph from '../components/ConnectGlyph';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);

  // If logged in, go to dashboard
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  // Splash simulation on load
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2500);
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

  const slides = [
    {
      title: 'Welcome to OPASS CONNECT',
      desc: 'The official alumni app for OPASS. Connect, engage and make an impact together.',
      image: '/opass-school-entrance.jpeg',
    },
    {
      title: 'Find Classmates',
      desc: 'Search alumni by year, house, profession and location. Reconnect with old friends.',
      image: '/opass-school-entrance.jpeg',
    },
    {
      title: 'Join Events & Assembly',
      desc: 'Attend live town halls, reunions, town halls and support school projects.',
      image: '/opass-school-entrance.jpeg',
    },
  ];

  if (step < slides.length && !user) {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-top">
          <Link href="/login" className="onboarding-skip">Skip</Link>
        </div>
        <div className="onboarding-body">
          <img src="/opass-crest.jpeg" alt="OPASS" className="crest" />
          <div className="logo-text">OPASS C<span className="c-link"><ConnectGlyph /></span>NNECT</div>
          <div className="sub">OFORI PANIN SENIOR HIGH SCHOOL</div>
          <h1>{slides[step].title}</h1>
          <p>{slides[step].desc}</p>
          <img src={slides[step].image} alt="" className="onboarding-image" />
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

  // After slides, show a simple "Get Started" screen
  return (
    <div className="onboarding-screen">
      <div className="onboarding-body" style={{ justifyContent: 'center' }}>
        <img src="/opass-crest.jpeg" alt="OPASS" className="crest" />
        <h1>Ready to connect?</h1>
        <p style={{ marginBottom: 32 }}>Join thousands of OPASS alumni building a stronger legacy.</p>
        <Link className="btn btn-block" href="/register">Create an account</Link>
        <Link className="btn btn-block btn-white" style={{ marginTop: 12, color: 'var(--blue)', border: '1px solid var(--border)' }} href="/login">I already have an account</Link>
      </div>
    </div>
  );
}
