import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, auth as authApi } from '../api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';
import styles from './Auth.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await auth.login({ email, password });
      const { token, user } = res.data;
      setAuth(token, user, null);
      const meRes = await authApi.me();
      setAuth(token, user, meRes.data.business);
      if (meRes.data.business) {
        navigate('/dashboard');
      } else {
        navigate('/setup');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed';
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
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} disabled={loading}>
            {loading ? <span className="loading-spinner" /> : 'Sign In'}
          </button>
        </form>

        <p className={styles.footer}>
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
