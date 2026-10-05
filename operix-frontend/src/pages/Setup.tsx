import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { business } from '../api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';
import { Zap, Building2 } from 'lucide-react';
import styles from './Setup.module.css';

const BUSINESS_TYPES = ['retail', 'wholesale', 'manufacturing', 'services', 'food & beverage', 'e-commerce', 'other'];
const CATEGORIES = ['electronics', 'clothing & apparel', 'food & grocery', 'health & beauty', 'home & furniture', 'sports & outdoor', 'automotive', 'books & media', 'general retail', 'other'];

export default function Setup() {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const { setBusiness } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await business.create({ name, type, category });
      setBusiness(res.data.business);
      toast.success('Business set up!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}><Zap size={15} color="#fff" /></div>
            <span>Operix AI</span>
          </div>
          <div className={styles.iconWrap}><Building2 size={28} color="#3b82f6" /></div>
          <h1>Set up your business</h1>
          <p>Tell us about your business so we can personalize your experience.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Business Name</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sunrise Electronics"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Business Type</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)} required>
              <option value="">Select type…</option>
              {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Product Category</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} disabled={loading}>
            {loading ? <span className="loading-spinner" /> : 'Create Business →'}
          </button>
        </form>
      </div>
    </div>
  );
}
