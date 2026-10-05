import { useState } from 'react';
import { business as bizApi, demo as demoApi } from '../api';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const BUSINESS_TYPES = ['retail','wholesale','manufacturing','services','food & beverage','e-commerce','other'];
const CATEGORIES = ['electronics','clothing & apparel','food & grocery','health & beauty','home & furniture','sports & outdoor','automotive','books & media','general retail','other'];

export default function Settings() {
  const { user, business, setBusiness, logout } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState(business?.name || '');
  const [type, setType] = useState(business?.type || '');
  const [category, setCategory] = useState(business?.category || '');
  const [saving, setSaving] = useState(false);
  const [clearingDemo, setClearingDemo] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await bizApi.update({ name, type, category });
      setBusiness(r.data.business);
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const clearDemo = async () => {
    setClearingDemo(true);
    try {
      await demoApi.clear();
      setBusiness({ ...business!, is_demo: false });
      toast.success('Demo data cleared');
    } catch { toast.error('Failed to clear demo'); }
    finally { setClearingDemo(false); }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="section-title">Settings</h1>
      <p className="section-subtitle">Manage your account and business settings</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Account</div>
        <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={user?.full_name || ''} disabled /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={user?.email || ''} disabled /></div>
      </div>

      <form onSubmit={save} className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Business Details</div>
        <div className="form-group"><label className="form-label">Business Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="form-group"><label className="form-label">Business Type</label>
          <select className="form-select" value={type} onChange={e => setType(e.target.value)} required>
            <option value="">Select…</option>
            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Category</label>
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)} required>
            <option value="">Select…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="loading-spinner" /> : 'Save Changes'}
        </button>
      </form>

      {business?.is_demo && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Demo Data</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Clear demo data to start fresh with your own data.</p>
          <button className="btn btn-danger" onClick={clearDemo} disabled={clearingDemo}>
            {clearingDemo ? <span className="loading-spinner" /> : 'Clear Demo Data'}
          </button>
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Sign Out</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>You will be redirected to the login page.</p>
        <button className="btn btn-secondary" onClick={() => { logout(); navigate('/login'); }}>Sign Out</button>
      </div>
    </div>
  );
}
