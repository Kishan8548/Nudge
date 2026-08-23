import { useNavigate } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import {
  Bot, Mic, Brain, BellRing, ChevronRight,
  GitBranch, Zap, Shield, Search, Users, Clock,
  ExternalLink, BarChart3, CheckCircle2, ArrowRight,
  FileAudio, ListChecks, AlertTriangle, Activity,
  Smartphone, Puzzle, Download, Laptop, X
} from 'lucide-react';
import NudgeLogo from '../components/NudgeLogo';

/* ─── Intersection Observer Hook ─── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Animated counter ─── */
function Counter({ to, suffix = '' }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(to / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(t); }
      else setCount(start);
    }, 18);
    return () => clearInterval(t);
  }, [visible, to]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Bento card with hover tilt ─── */
function BentoCard({ className = '', children, accent = false, href }) {
  const ref = useRef(null);
  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 8;
    const y = ((e.clientY - top) / height - 0.5) * -8;
    el.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg) translateZ(2px)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = '';
  }
  const Tag = href ? 'a' : 'div';
  return (
    <Tag
      ref={ref}
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      className={`bento-card ${accent ? 'bento-card-accent' : ''} ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </Tag>
  );
}

/* ─── Typing animation ─── */
function TypingText({ words }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [del, setDel] = useState(false);
  useEffect(() => {
    const word = words[idx];
    if (!del && text === word) {
      const t = setTimeout(() => setDel(true), 1800);
      return () => clearTimeout(t);
    }
    if (del && text === '') {
      setDel(false);
      setIdx((i) => (i + 1) % words.length);
      return;
    }
    const speed = del ? 40 : 70;
    const t = setTimeout(() => {
      setText(del ? text.slice(0, -1) : word.slice(0, text.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [text, del, idx, words]);
  return (
    <span className="typing-word">
      {text}
      <span className="typing-cursor" />
    </span>
  );
}

/* ═══════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showExtModal, setShowExtModal] = useState(false);
  const [heroRef, heroVisible] = useReveal();
  const [bentoRef, bentoVisible] = useReveal();
  const [ecoRef, ecoVisible] = useReveal();
  const [statsRef, statsVisible] = useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp-root">
      {/* ── NAV ── */}
      <header className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="/" className="lp-brand">
            <NudgeLogo size={30} />
            <span className="lp-brand-name">Nudge</span>
            <span className="lp-brand-tag">AI</span>
          </a>
          <nav className="lp-nav-links">
            <button onClick={() => setShowExtModal(true)} className="lp-nav-link" style={{ background: 'none', border: 'none', font: 'inherit' }}>
              <Puzzle size={14} />
              Chrome Extension
            </button>
            <a href="https://github.com/Kishan8548/Nudge/releases/latest" target="_blank" rel="noreferrer" className="lp-nav-link">
              <Smartphone size={14} />
              Android APK
            </a>
            <a href="https://github.com/Kishan8548/Nudge" target="_blank" rel="noreferrer" className="lp-nav-link">
              <GitBranch size={14} />
              GitHub
            </a>
            <a href="https://nudge-backend-8fri.onrender.com/docs" target="_blank" rel="noreferrer" className="lp-nav-link">
              API Docs
            </a>
          </nav>
          <button className="lp-cta-btn" onClick={() => navigate('/dashboard')}>
            Open App <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero" ref={heroRef}>
        {/* Ambient orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        {/* Noise overlay */}
        <div className="noise-overlay" />

        <div className={`lp-hero-inner ${heroVisible ? 'reveal-in' : ''}`}>
          <a href="https://github.com/Kishan8548/Nudge" target="_blank" rel="noreferrer" className="hero-pill">
            <span className="hero-pill-dot" />
            <span>Open Source · Chrome Extension + Android App + FastAPI</span>
            <ArrowRight size={11} />
          </a>

          <h1 className="hero-h1">
            Meetings end.<br />
            <span className="hero-gradient-text">Follow-ups&nbsp;
              <TypingText words={['don\'t.', 'happen.', 'matter.']} />
            </span>
          </h1>

          <p className="hero-sub">
            A LangGraph multi-agent engine that captures meetings from your browser tab or phone,
            extracts action items with confidence scores, assigns owners,
            and autonomously reminds your team — until every task is done.
          </p>

          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={() => navigate('/dashboard')}>
              Open Dashboard
              <ArrowRight size={16} />
            </button>
            <a
              href="https://github.com/Kishan8548/Nudge/releases/latest"
              target="_blank"
              rel="noreferrer"
              className="hero-btn-secondary"
            >
              <Smartphone size={16} color="#10B981" />
              Download APK (v1.1.0)
            </a>
            <button
              onClick={() => setShowExtModal(true)}
              className="hero-btn-secondary"
            >
              <Puzzle size={16} color="#38BDF8" />
              Chrome Extension
            </button>
          </div>

          {/* Mini stats bar */}
          <div className="hero-stats-bar" ref={statsRef}>
            <div className="hero-stat">
              <span className="hero-stat-n">{statsVisible ? <Counter to={200} suffix=" MB" /> : '0'}</span>
              <span className="hero-stat-l">max audio size</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hero-stat-n">3</span>
              <span className="hero-stat-l">LangGraph agents</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hero-stat-n">0.7</span>
              <span className="hero-stat-l">HITL threshold</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hero-stat-n">{statsVisible ? <Counter to={40} suffix="+" /> : '0'}</span>
              <span className="hero-stat-l">API endpoints</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENTO GRID ── */}
      <section className="lp-section" ref={bentoRef}>
        <div className={`lp-section-inner ${bentoVisible ? 'reveal-in' : ''}`}>
          <p className="section-eyebrow">How it works</p>
          <h2 className="section-h2">One pipeline.<br />Zero missed follow-ups.</h2>

          <div className="bento-grid">
            {/* Big left — capture */}
            <BentoCard className="bento-lg" accent>
              <div className="bento-tag">Step 01</div>
              <div className="bento-icon-wrap bento-teal">
                <Mic size={22} strokeWidth={2} />
              </div>
              <h3 className="bento-h3">Capture</h3>
              <p className="bento-p">
                Chrome Extension (Manifest V3 + Offscreen Documents API) records tab audio from Google Meet or Zoom without a bot. A custom chunking algorithm splits files to bypass Whisper's 25 MB limit — supporting up to 200 MB recordings.
              </p>
              <div className="bento-tag-row">
                <span className="bento-chip">Chrome Extension</span>
                <span className="bento-chip">Android App</span>
                <span className="bento-chip">200 MB</span>
              </div>
            </BentoCard>

            {/* Top right — extract */}
            <BentoCard className="bento-sm">
              <div className="bento-tag">Step 02</div>
              <div className="bento-icon-wrap bento-purple">
                <Brain size={20} strokeWidth={2} />
              </div>
              <h3 className="bento-h3">Extract</h3>
              <p className="bento-p-sm">
                LangGraph Supervisor orchestrates an Extraction Specialist and Assignment Engine. Fuzzy-matches owners to team rosters. Resolves "by next Friday" to ISO dates.
              </p>
            </BentoCard>

            {/* Bottom right — remind */}
            <BentoCard className="bento-sm">
              <div className="bento-tag">Step 03</div>
              <div className="bento-icon-wrap bento-amber">
                <BellRing size={20} strokeWidth={2} />
              </div>
              <h3 className="bento-h3">Remind</h3>
              <p className="bento-p-sm">
                APScheduler fires an escalating email loop on the FastAPI backend. Reminders increase in urgency until the assignee marks the task done.
              </p>
            </BentoCard>

            {/* HITL card */}
            <BentoCard className="bento-md">
              <div className="bento-icon-wrap bento-orange">
                <Shield size={20} strokeWidth={2} />
              </div>
              <h3 className="bento-h3">Human-in-the-Loop</h3>
              <p className="bento-p-sm">
                Items with confidence &lt; 0.7 are flagged orange in the dashboard. A human approves, edits, or rejects before any reminder fires.
              </p>
              <div className="hitl-preview">
                <div className="hitl-item hitl-ok"><CheckCircle2 size={12} /> "Ship analytics dashboard" · Ananya · 0.98</div>
                <div className="hitl-item hitl-warn"><AlertTriangle size={12} /> "Organise Q&A practice" · Unknown · 0.55</div>
                <div className="hitl-item hitl-ok"><CheckCircle2 size={12} /> "Fix intro slide" · Kishan · 0.99</div>
              </div>
            </BentoCard>

            {/* RAG card */}
            <BentoCard className="bento-md">
              <div className="bento-icon-wrap bento-blue">
                <Search size={20} strokeWidth={2} />
              </div>
              <h3 className="bento-h3">RAG Semantic Search</h3>
              <p className="bento-p-sm">
                Nomic embeddings stored in MongoDB let you query any past decision by meaning. "What did we decide about the API?" — finds it instantly across all meetings.
              </p>
              <div className="rag-preview">
                <div className="rag-bar rag-bar-1" />
                <div className="rag-bar rag-bar-2" />
                <div className="rag-bar rag-bar-3" />
              </div>
            </BentoCard>

            {/* Analytics card — wide */}
            <BentoCard className="bento-wide">
              <div className="bento-icon-wrap bento-teal">
                <BarChart3 size={20} strokeWidth={2} />
              </div>
              <div className="bento-wide-content">
                <div>
                  <h3 className="bento-h3">Analytics Dashboard</h3>
                  <p className="bento-p-sm">Real-time command center. Track pending vs completed, escalated items, and reminder cadence across all meetings.</p>
                </div>
                <div className="mini-dashboard">
                  <div className="mini-stat mini-stat-teal">
                    <FileAudio size={14} /> <span>3</span> <small>Meetings</small>
                  </div>
                  <div className="mini-stat mini-stat-amber">
                    <ListChecks size={14} /> <span>7</span> <small>Pending</small>
                  </div>
                  <div className="mini-stat mini-stat-green">
                    <CheckCircle2 size={14} /> <span>4</span> <small>Done</small>
                  </div>
                  <div className="mini-stat mini-stat-red">
                    <AlertTriangle size={14} /> <span>1</span> <small>Review</small>
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM & APPS SECTION ── */}
      <section className="lp-section" ref={ecoRef}>
        <div className={`lp-section-inner ${ecoVisible ? 'reveal-in' : ''}`}>
          <p className="section-eyebrow">Multi-Platform Ingestion & Follow-Ups</p>
          <h2 className="section-h2">Capture anywhere.<br />Follow up everywhere.</h2>
          <p className="section-sub" style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 40px' }}>
            Nudge AI captures meetings from your desktop browser or phone, and follows up autonomously across exact Android alarms, Gmail 1-click actions, and WhatsApp.
          </p>

          <div className="eco-grid">
            {/* Chrome Extension Card */}
            <div className="eco-card eco-card-chrome">
              <div className="eco-card-header">
                <div className="eco-icon-wrap" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}>
                  <Puzzle size={26} />
                </div>
                <div>
                  <span className="eco-badge eco-badge-blue">Chrome Extension · Manifest V3</span>
                  <h3 className="eco-title">1-Click Desktop Meeting Capture</h3>
                </div>
              </div>
              <p className="eco-desc">
                Records tab audio from Google Meet and Zoom Web without inviting any intrusive recording bots. Features offscreen chunking to capture meetings up to 200 MB with zero echo.
              </p>
              <ul className="eco-list">
                <li><CheckCircle2 size={15} color="#38BDF8" /> Direct Tab Audio Capture (Google Meet / Zoom)</li>
                <li><CheckCircle2 size={15} color="#38BDF8" /> Zero Bot Join & Zero Audio Echo</li>
                <li><CheckCircle2 size={15} color="#38BDF8" /> Live Duration Counter & 1-Click Upload</li>
              </ul>
              <div className="eco-actions">
                <button className="eco-btn-primary" onClick={() => setShowExtModal(true)}>
                  <Puzzle size={15} /> Setup Extension Guide
                </button>
                <a href="https://github.com/Kishan8548/Nudge/tree/main/extension" target="_blank" rel="noreferrer" className="eco-btn-secondary">
                  <GitBranch size={15} /> View Extension Code
                </a>
              </div>
            </div>

            {/* Android App Card */}
            <div className="eco-card eco-card-android">
              <div className="eco-card-header">
                <div className="eco-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                  <Smartphone size={26} />
                </div>
                <div>
                  <span className="eco-badge eco-badge-green">Android Native · Kotlin v1.1.0</span>
                  <h3 className="eco-title">Native App & Exact System Alarms</h3>
                </div>
              </div>
              <p className="eco-desc">
                Native Kotlin application with exact system alarm integration. Rings heads-up lock-screen alerts on time even when the app is completely off or in Android Doze mode.
              </p>
              <ul className="eco-list">
                <li><CheckCircle2 size={15} color="#10B981" /> Exact <code>AlarmManager</code> Hardware Wake Alarms</li>
                <li><CheckCircle2 size={15} color="#10B981" /> Home Screen Quick Record AppWidget</li>
                <li><CheckCircle2 size={15} color="#10B981" /> Auto-Boot Recovery & Real-Time Sync</li>
              </ul>
              <div className="eco-actions">
                <a href="https://github.com/Kishan8548/Nudge/releases/latest" target="_blank" rel="noreferrer" className="eco-btn-primary" style={{ background: '#10B981', color: '#050505' }}>
                  <Download size={15} /> Download APK (v1.1.0)
                </a>
                <a href="https://github.com/Kishan8548/Nudge/releases" target="_blank" rel="noreferrer" className="eco-btn-secondary">
                  <ExternalLink size={15} /> Release Notes
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STACK SECTION ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <p className="section-eyebrow">Tech Stack</p>
          <h2 className="section-h2">Production-grade, end to end.</h2>
          <div className="stack-row">
            {[
              { name: 'LangGraph', role: 'Multi-agent orchestration', color: '#0D9488' },
              { name: 'Groq Whisper', role: 'Audio transcription', color: '#8B5CF6' },
              { name: 'FastAPI', role: 'Async REST backend', color: '#F97316' },
              { name: 'MongoDB Atlas', role: 'Cloud database + vector store', color: '#10B981' },
              { name: 'Kotlin', role: 'Native Android app', color: '#7C3AED' },
              { name: 'React + Vite', role: 'Dashboard frontend', color: '#38BDF8' },
              { name: 'Nomic Embed', role: 'Semantic RAG search', color: '#F59E0B' },
              { name: 'APScheduler', role: 'Background reminder loop', color: '#EC4899' },
            ].map((s) => (
              <div className="stack-pill" key={s.name}>
                <span className="stack-dot" style={{ background: s.color }} />
                <div>
                  <div className="stack-name">{s.name}</div>
                  <div className="stack-role">{s.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <p className="section-eyebrow">Architecture</p>
          <h2 className="section-h2">Multi-agent. Deterministic. Accountable.</h2>
          <div className="arch-flow">
            {[
              { icon: Mic, label: 'Chrome Extension\n/ Android App', color: '#0D9488' },
              { icon: Activity, label: 'FastAPI\nBackend', color: '#F97316' },
              { icon: Brain, label: 'LangGraph\nSupervisor', color: '#8B5CF6' },
              { icon: Users, label: 'Extraction +\nAssignment Agents', color: '#8B5CF6' },
              { icon: BarChart3, label: 'MongoDB Atlas\n+ RAG', color: '#10B981' },
              { icon: BellRing, label: 'Reminder\nScheduler', color: '#F59E0B' },
            ].map((node, i) => (
              <div key={i} className="arch-step">
                <div className="arch-node" style={{ borderColor: `${node.color}40`, background: `${node.color}0e` }}>
                  <node.icon size={18} color={node.color} strokeWidth={2} />
                </div>
                <div className="arch-label">{node.label}</div>
                {i < 5 && <div className="arch-arrow"><ArrowRight size={14} color="#334155" /></div>}
              </div>
            ))}
          </div>
          <div className="arch-points-grid">
            {[
              'MongoDBSaver checkpointing preserves agent state across crashes',
              'Supervisor routes to specialist agents based on task phase',
              'Custom chunking algorithm concatenates Whisper transcript chunks',
              'Confidence score < 0.7 triggers HITL review — no reminders fire',
              'APScheduler polls pending items every N minutes (configurable)',
              'Nomic embeddings enable semantic search across all meeting history',
            ].map((pt, i) => (
              <div key={i} className="arch-point">
                <CheckCircle2 size={14} color="#0D9488" strokeWidth={2.5} />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-inner">
          <div className="orb orb-cta" />
          <p className="section-eyebrow">Live Demo</p>
          <h2 className="cta-h2">
            Pre-loaded with demo data.<br />No setup required.
          </h2>
          <p className="cta-sub">
            The dashboard is seeded with realistic meetings, action items, and agent reasoning traces — ready for any interviewer or stakeholder to explore.
          </p>
          <div className="cta-actions">
            <button className="hero-btn-primary" onClick={() => navigate('/dashboard')}>
              Open Dashboard <ArrowRight size={16} />
            </button>
            <a
              href="https://github.com/Kishan8548/Nudge"
              target="_blank"
              rel="noreferrer"
              className="hero-btn-secondary"
            >
              <ExternalLink size={15} /> View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <a href="/" className="lp-brand">
            <span className="lp-brand-icon"><Bot size={14} strokeWidth={2.5} /></span>
            <span className="lp-brand-name">Nudge</span>
            <span className="lp-brand-tag">AI</span>
          </a>
          <p className="footer-sub">AI that turns meetings into accountability.</p>
          <p className="footer-stack">FastAPI · LangGraph · Groq · Kotlin · React · MongoDB Atlas · Nomic</p>
        </div>
      </footer>

      {/* ── CHROME EXTENSION MODAL ── */}
      {showExtModal && (
        <div className="modal-backdrop" onClick={() => setShowExtModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Puzzle size={22} color="#38BDF8" />
                <h3>Install Nudge Chrome Extension</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowExtModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">
                Capture live Google Meet & Zoom Web meetings in 1 click without inviting an intrusive bot:
              </p>
              <div className="modal-steps">
                <div className="modal-step">
                  <div className="step-num">1</div>
                  <div className="step-text">
                    <strong>Clone or Download the Repository:</strong>
                    <span>Locate the <code>/extension</code> folder in the Nudge project.</span>
                  </div>
                </div>
                <div className="modal-step">
                  <div className="step-num">2</div>
                  <div className="step-text">
                    <strong>Open Chrome Extensions:</strong>
                    <span>Navigate to <code>chrome://extensions</code> and turn on <strong>Developer mode</strong> (top right switch).</span>
                  </div>
                </div>
                <div className="modal-step">
                  <div className="step-num">3</div>
                  <div className="step-text">
                    <strong>Load Unpacked:</strong>
                    <span>Click <strong>Load unpacked</strong> and select the <code>Nudge/extension</code> directory.</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer-actions">
                <a href="https://github.com/Kishan8548/Nudge/tree/main/extension" target="_blank" rel="noreferrer" className="hero-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <GitBranch size={15} /> View Extension on GitHub
                </a>
                <button className="hero-btn-secondary" onClick={() => setShowExtModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ALL STYLES ══ */}
      <style>{`
        html { scroll-behavior: smooth; }

        /* ── Ecosystem Grid ── */
        .eco-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }
        .eco-card {
          background: rgba(18, 18, 24, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 32px;
          text-align: left;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(12px);
          transition: transform 200ms, border-color 200ms;
        }
        .eco-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.16);
        }
        .eco-card-chrome { border-top: 3px solid #38BDF8; }
        .eco-card-android { border-top: 3px solid #10B981; }
        .eco-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .eco-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .eco-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: 6px;
          margin-bottom: 4px;
        }
        .eco-badge-blue { background: rgba(56, 189, 248, 0.15); color: #38BDF8; }
        .eco-badge-green { background: rgba(16, 185, 129, 0.15); color: #10B981; }
        .eco-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #F8FAFC;
          margin: 0;
        }
        .eco-desc {
          font-size: 0.9rem;
          color: #94A3B8;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .eco-list {
          list-style: none;
          padding: 0;
          margin: 0 0 28px 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .eco-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          color: #CBD5E1;
        }
        .eco-actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
          flex-wrap: wrap;
        }
        .eco-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: #38BDF8;
          color: #050505;
          border: none;
          border-radius: 10px;
          font-size: 0.84rem;
          font-weight: 700;
          font-family: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: transform 150ms, filter 150ms;
        }
        .eco-btn-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .eco-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.05);
          color: #F8FAFC;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          font-size: 0.84rem;
          font-weight: 600;
          font-family: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: background 150ms;
        }
        .eco-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.09);
        }

        /* ── Modal ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 150ms ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-content {
          background: #111116;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          max-width: 520px;
          width: 100%;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
          overflow: hidden;
          animation: modalPop 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .modal-title-wrap h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #F8FAFC;
          margin: 0;
        }
        .modal-close-btn {
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: color 150ms;
        }
        .modal-close-btn:hover { color: #F8FAFC; background: rgba(255, 255, 255, 0.08); }
        .modal-body {
          padding: 24px;
        }
        .modal-intro {
          font-size: 0.9rem;
          color: #94A3B8;
          margin: 0 0 20px 0;
          line-height: 1.5;
        }
        .modal-steps {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 24px;
        }
        .modal-step {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #38BDF8;
          color: #050505;
          font-weight: 800;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .step-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.85rem;
          color: #CBD5E1;
        }
        .step-text code {
          background: rgba(56, 189, 248, 0.15);
          color: #38BDF8;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .modal-footer-actions {
          display: flex;
          gap: 12px;
        }

        /* ── Root ── */
        .lp-root {
          min-height: 100vh;
          background: #050505;
          color: #F8FAFC;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
        }

        /* ── Reveal animation ── */
        .reveal-in {
          animation: revealUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── NAV ── */
        .lp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          transition: background 200ms, border-color 200ms, backdrop-filter 200ms;
          border-bottom: 1px solid transparent;
        }
        .lp-nav-scrolled {
          background: rgba(5,5,5,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-color: rgba(255,255,255,0.06);
        }
        .lp-nav-inner {
          max-width: 1160px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .lp-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .lp-brand-icon {
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #0D9488, #14B8A6);
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .lp-brand-name {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #F8FAFC;
        }
        .lp-brand-tag {
          font-size: 0.65rem;
          font-weight: 700;
          color: #0D9488;
          background: rgba(13,148,136,0.12);
          border: 1px solid rgba(13,148,136,0.25);
          border-radius: 4px;
          padding: 1px 5px;
          letter-spacing: 0.04em;
        }
        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: auto;
        }
        .lp-nav-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 12px;
          border-radius: 7px;
          font-size: 0.83rem;
          font-weight: 500;
          color: #94A3B8;
          text-decoration: none;
          transition: color 150ms, background 150ms;
          cursor: pointer;
        }
        .lp-nav-link:hover { color: #F8FAFC; background: rgba(255,255,255,0.05); }
        .lp-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          background: #F8FAFC;
          color: #050505;
          border: none;
          border-radius: 8px;
          font-size: 0.83rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background 150ms, transform 150ms;
          flex-shrink: 0;
        }
        .lp-cta-btn:hover { background: #e2e8f0; transform: translateY(-1px); }

        /* ── HERO ── */
        .lp-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 120px 32px 80px;
          text-align: center;
          overflow: hidden;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .orb-1 {
          width: 700px; height: 500px;
          top: -100px; left: 50%;
          transform: translateX(-60%);
          background: radial-gradient(ellipse, rgba(13,148,136,0.18) 0%, transparent 65%);
        }
        .orb-2 {
          width: 500px; height: 400px;
          top: 40%; right: -100px;
          background: radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%);
        }
        .orb-3 {
          width: 400px; height: 350px;
          bottom: 0; left: -80px;
          background: radial-gradient(ellipse, rgba(249,115,22,0.07) 0%, transparent 70%);
        }
        .orb-cta {
          width: 600px; height: 400px;
          top: -80px; left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(ellipse, rgba(13,148,136,0.2) 0%, transparent 65%);
          position: absolute;
        }
        .noise-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          pointer-events: none;
        }
        .lp-hero-inner {
          position: relative;
          max-width: 780px;
          margin: 0 auto;
        }
        .hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 13px 5px 8px;
          border-radius: 99px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          font-size: 0.75rem;
          font-weight: 500;
          color: #94A3B8;
          text-decoration: none;
          margin-bottom: 28px;
          cursor: pointer;
          transition: border-color 150ms, color 150ms;
        }
        .hero-pill:hover { border-color: rgba(13,148,136,0.4); color: #F8FAFC; }
        .hero-pill-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #0D9488;
          box-shadow: 0 0 6px #0D9488;
          animation: pulse-dot 2s ease infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .hero-h1 {
          font-size: clamp(2.6rem, 5.5vw, 4.2rem);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.04em;
          color: #F8FAFC;
          margin-bottom: 22px;
        }
        .hero-gradient-text {
          background: linear-gradient(92deg, #0D9488 0%, #14B8A6 35%, #F97316 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .typing-word {
          position: relative;
        }
        .typing-cursor {
          display: inline-block;
          width: 3px;
          height: 0.85em;
          background: #0D9488;
          margin-left: 2px;
          vertical-align: middle;
          border-radius: 1px;
          animation: blink 0.9s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
        .hero-sub {
          font-size: 1.1rem;
          color: #64748B;
          line-height: 1.72;
          max-width: 600px;
          margin: 0 auto 36px;
          font-weight: 400;
        }
        .hero-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 52px;
        }
        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 26px;
          background: #F8FAFC;
          color: #050505;
          border: none;
          border-radius: 9px;
          font-size: 0.92rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 180ms;
        }
        .hero-btn-primary:hover { background: #e2e8f0; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 22px;
          background: transparent;
          color: #94A3B8;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 9px;
          font-size: 0.92rem;
          font-weight: 600;
          font-family: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: all 180ms;
        }
        .hero-btn-secondary:hover { color: #F8FAFC; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.04); }
        .hero-stats-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          flex-wrap: wrap;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 16px 32px;
          gap: 0;
        }
        .hero-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 28px;
          gap: 3px;
        }
        .hero-stat-n {
          font-size: 1.45rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #F8FAFC;
        }
        .hero-stat-l {
          font-size: 0.72rem;
          color: #475569;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .hero-stat-sep {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,0.07);
        }

        /* ── SECTIONS ── */
        .lp-section {
          padding: 96px 32px;
        }
        .lp-section-alt {
          background: rgba(255,255,255,0.012);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lp-section-inner {
          max-width: 1160px;
          margin: 0 auto;
        }
        .section-eyebrow {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #0D9488;
          margin-bottom: 12px;
        }
        .section-h2 {
          font-size: clamp(1.9rem, 3.2vw, 2.8rem);
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1.12;
          margin-bottom: 52px;
          color: #F8FAFC;
        }

        /* ── BENTO GRID ── */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          grid-template-rows: auto;
          gap: 14px;
        }
        .bento-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 26px;
          cursor: default;
          transition: border-color 220ms, background 220ms, transform 220ms, box-shadow 220ms;
          transform-style: preserve-3d;
          will-change: transform;
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .bento-card:hover {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 1px rgba(13,148,136,0.08), 0 16px 40px rgba(0,0,0,0.3);
        }
        .bento-card-accent {
          border-color: rgba(13,148,136,0.2);
          background: linear-gradient(145deg, rgba(13,148,136,0.06) 0%, rgba(5,5,5,0.5) 60%);
        }
        .bento-card-accent:hover {
          border-color: rgba(13,148,136,0.35);
          background: linear-gradient(145deg, rgba(13,148,136,0.1) 0%, rgba(5,5,5,0.5) 60%);
        }
        .bento-lg { grid-column: span 3; grid-row: span 2; }
        .bento-sm { grid-column: span 3; }
        .bento-md { grid-column: span 3; }
        .bento-wide { grid-column: span 6; }

        @media (max-width: 900px) {
          .bento-grid { grid-template-columns: 1fr; }
          .bento-lg, .bento-sm, .bento-md, .bento-wide { grid-column: span 1; grid-row: span 1; }
        }

        .bento-tag {
          font-size: 0.67rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
          margin-bottom: 16px;
        }
        .bento-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .bento-teal  { background: rgba(13,148,136,0.15); color: #0D9488; }
        .bento-purple{ background: rgba(139,92,246,0.15); color: #8B5CF6; }
        .bento-amber { background: rgba(245,158,11,0.15);  color: #F59E0B; }
        .bento-orange{ background: rgba(249,115,22,0.15); color: #F97316; }
        .bento-blue  { background: rgba(59,130,246,0.15);  color: #3B82F6; }
        .bento-h3 {
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #F8FAFC;
          margin-bottom: 10px;
        }
        .bento-p {
          font-size: 0.87rem;
          color: #64748B;
          line-height: 1.65;
          margin-bottom: 20px;
        }
        .bento-p-sm {
          font-size: 0.83rem;
          color: #64748B;
          line-height: 1.62;
        }
        .bento-tag-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 20px;
        }
        .bento-chip {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 99px;
          background: rgba(13,148,136,0.1);
          border: 1px solid rgba(13,148,136,0.2);
          color: #0D9488;
        }
        .bento-wide-content {
          display: flex;
          align-items: flex-start;
          gap: 32px;
          flex-wrap: wrap;
        }
        .bento-wide-content > *:first-child { flex: 1; min-width: 200px; }

        /* HITL preview */
        .hitl-preview {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .hitl-item {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.73rem;
          padding: 7px 10px;
          border-radius: 7px;
          font-weight: 500;
        }
        .hitl-ok {
          background: rgba(16,185,129,0.08);
          color: #10B981;
          border: 1px solid rgba(16,185,129,0.15);
        }
        .hitl-warn {
          background: rgba(245,158,11,0.1);
          color: #F59E0B;
          border: 1px solid rgba(245,158,11,0.2);
        }

        /* RAG preview */
        .rag-preview {
          margin-top: 18px;
          display: flex;
          gap: 5px;
          align-items: flex-end;
          height: 40px;
        }
        .rag-bar {
          flex: 1;
          border-radius: 4px 4px 0 0;
          background: rgba(59,130,246,0.2);
          animation: rag-rise 1.4s ease both;
        }
        .rag-bar-1 { height: 60%; animation-delay: 0.1s; }
        .rag-bar-2 { height: 95%; animation-delay: 0.22s; background: rgba(59,130,246,0.45); }
        .rag-bar-3 { height: 40%; animation-delay: 0.34s; }
        @keyframes rag-rise {
          from { transform: scaleY(0); transform-origin: bottom; }
          to   { transform: scaleY(1); }
        }

        /* Mini dashboard */
        .mini-dashboard {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .mini-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .mini-stat span { font-size: 1.1rem; font-weight: 800; }
        .mini-stat small { font-size: 0.7rem; opacity: 0.7; }
        .mini-stat-teal  { background: rgba(13,148,136,0.1); color: #0D9488; border: 1px solid rgba(13,148,136,0.15); }
        .mini-stat-amber { background: rgba(245,158,11,0.1); color: #F59E0B; border: 1px solid rgba(245,158,11,0.15); }
        .mini-stat-green { background: rgba(16,185,129,0.1); color: #10B981; border: 1px solid rgba(16,185,129,0.15); }
        .mini-stat-red   { background: rgba(239,68,68,0.1);  color: #EF4444; border: 1px solid rgba(239,68,68,0.15); }

        /* ── STACK ── */
        .stack-row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .stack-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 150ms, background 150ms;
          cursor: default;
        }
        .stack-pill:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }
        .stack-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .stack-name { font-size: 0.87rem; font-weight: 700; color: #E2E8F0; }
        .stack-role { font-size: 0.74rem; color: #475569; margin-top: 2px; }

        /* ── ARCH ── */
        .arch-flow {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0;
          margin-bottom: 48px;
          overflow-x: auto;
          padding: 20px 0;
        }
        .arch-step {
          display: flex;
          align-items: center;
          gap: 0;
          flex-shrink: 0;
        }
        .arch-node {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 200ms;
        }
        .arch-node:hover { transform: scale(1.1); }
        .arch-label {
          font-size: 0.68rem;
          color: #475569;
          font-weight: 500;
          text-align: center;
          max-width: 64px;
          margin: 0 8px;
          line-height: 1.4;
          white-space: pre-line;
        }
        .arch-arrow { display: flex; align-items: center; }
        .arch-points-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 12px;
        }
        .arch-point {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.84rem;
          color: #64748B;
          padding: 12px 14px;
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          line-height: 1.5;
        }
        .arch-point svg { flex-shrink: 0; margin-top: 1px; }

        /* ── CTA SECTION ── */
        .lp-cta-section {
          padding: 100px 32px;
          text-align: center;
          position: relative;
          overflow: hidden;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .lp-cta-inner {
          max-width: 640px;
          margin: 0 auto;
          position: relative;
        }
        .cta-h2 {
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.1;
          margin-bottom: 18px;
          color: #F8FAFC;
        }
        .cta-sub {
          font-size: 1rem;
          color: #64748B;
          line-height: 1.7;
          margin-bottom: 40px;
        }
        .cta-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ── FOOTER ── */
        .lp-footer {
          padding: 36px 32px;
          border-top: 1px solid rgba(255,255,255,0.05);
          text-align: center;
        }
        .lp-footer-inner {
          max-width: 640px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .footer-sub { font-size: 0.85rem; color: #475569; font-style: italic; }
        .footer-stack { font-size: 0.72rem; color: #334155; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .lp-nav-inner { padding: 14px 20px; }
          .lp-nav-links { display: none; }
          .lp-section { padding: 64px 20px; }
          .lp-hero { padding: 100px 20px 60px; }
          .hero-stats-bar { padding: 14px 16px; gap: 0; }
          .hero-stat { padding: 0 14px; }
          .hero-stat-sep { height: 28px; }
          .arch-flow { gap: 8px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal-in, .rag-bar, .typing-cursor { animation: none; }
          .hero-pill-dot { animation: none; }
        }
      `}</style>
    </div>
  );
}
