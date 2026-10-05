import { useNavigate } from 'react-router-dom';
import { Zap, BarChart2, AlertTriangle, Lightbulb, MessageSquare, ArrowRight, Play, TrendingUp, Shield } from 'lucide-react';
import { auth, demo } from '../api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';
import styles from './Landing.module.css';

const features = [
  { icon: BarChart2, title: 'Sales Intelligence', desc: 'Analyze revenue trends, top products, and growth over any period with interactive charts.', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { icon: AlertTriangle, title: 'Risk Detection', desc: 'Automatically surface stockout risks, declining sales, overstock, and demand anomalies.', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { icon: Lightbulb, title: 'AI Recommendations', desc: 'Get clear, data-driven action cards — what to reorder, what to promote, what to watch.', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { icon: MessageSquare, title: 'Operix Assistant', desc: 'Ask plain-English questions about your business and get instant answers from your data.', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { icon: TrendingUp, title: 'Demand Forecasting', desc: 'ML-powered 7, 30 and 90-day demand predictions built on your actual sales history.', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { icon: Shield, title: 'Data Transparency', desc: 'Every prediction explains why — no black-box scores, just clear business reasoning.', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { setAuth, setBusiness } = useAuthStore();

  const handleExploreDemo = async () => {
    const tid = toast.loading('Loading demo data…');
    try {
      const email = `demo-${Date.now()}@operix.demo`;
      const password = 'Demo1234!';
      const signupRes = await auth.signup({ email, password, full_name: 'Demo User' });
      const { token, user } = signupRes.data;
      setAuth(token, user, null);

      const demoRes = await demo.seed();
      const { business } = demoRes.data;
      setBusiness(business);

      toast.success('Demo loaded!', { id: tid });
      navigate('/dashboard');
    } catch {
      toast.error('Failed to load demo. Please try again.', { id: tid });
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}><Zap size={18} color="#fff" /></div>
          <span>Operix AI</span>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>
            <Zap size={11} />
            AI-Powered Business Intelligence
          </div>
          <h1 className={styles.heroTitle}>
            Turn Business Data Into<br /><em>Better Decisions.</em>
          </h1>
          <p className={styles.heroSubtitle}>
            Analyze sales. Predict demand. Detect risks. Take smarter action.<br />
            Built for small and medium-sized businesses — no data science required.
          </p>
          <div className={styles.heroActions}>
            <button className={`btn btn-primary ${styles.ctaBtn}`} onClick={() => navigate('/signup')}>
              Get Started Free <ArrowRight size={16} />
            </button>
            <button className={`btn btn-secondary ${styles.ctaBtn}`} onClick={handleExploreDemo}>
              <Play size={14} /> Explore Demo
            </button>
          </div>
        </section>

        {/* Stats */}
        <div className={styles.statsBar}>
          {[
            { value: '180+', label: 'Days of analysis' },
            { value: '10+', label: 'Risk signals detected' },
            { value: '3', label: 'Forecast horizons' },
            { value: '100%', label: 'Data transparency' },
          ].map(s => (
            <div key={s.label} className={styles.stat}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <section className={styles.features}>
          <h2 className={styles.featuresTitle}>Everything your business needs to grow smarter</h2>
          <p className={styles.featuresSubtitle}>Six intelligent modules working together from a single platform.</p>
          <div className={styles.featureGrid}>
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className={styles.featureCard}>
                <div className={styles.featureIcon} style={{ background: bg }}>
                  <Icon size={22} color={color} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Journey */}
        <section className={styles.journey}>
          <h2>One clear path from data to decision</h2>
          <div className={styles.steps}>
            {['Upload Data', 'AI Analysis', 'Demand Forecast', 'Risk Detection', 'Smart Actions'].map((step, i) => (
              <div key={step} className={styles.step}>
                <div className={styles.stepNum}>{i + 1}</div>
                <span>{step}</span>
                {i < 4 && <ArrowRight size={13} className={styles.stepArrow} />}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className={styles.cta}>
          <h2>Ready to understand your business?</h2>
          <p>No complex setup. No data science degree required. Start in minutes.</p>
          <div className={styles.heroActions} style={{ marginTop: 32 }}>
            <button className={`btn btn-primary ${styles.ctaBtn}`} onClick={() => navigate('/signup')}>
              Start Free <ArrowRight size={16} />
            </button>
            <button className={`btn btn-secondary ${styles.ctaBtn}`} onClick={handleExploreDemo}>
              <Play size={14} /> Try the Demo
            </button>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        © 2024 Operix AI — Decision-support intelligence for growing businesses.
      </footer>
    </div>
  );
}
