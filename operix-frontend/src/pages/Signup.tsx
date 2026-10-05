import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';
import styles from './Auth.module.css';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await auth.signup({ email, password, full_name: fullName });
      const { token, user } = res.data;
      setAuth(token, user, null);
      navigate('/setup');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Signup failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}><Zap size={16} color="#fff" /></div>
          <span>Operix AI</span>
        </div>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start making smarter business decisions</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} disabled={loading}>
            {loading ? <span className="loading-spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
