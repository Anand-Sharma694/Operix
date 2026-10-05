import { useEffect, useState } from 'react';
import { recommendations } from '../api';
import { useAuthStore } from '../store/auth';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './AIRecommendations.module.css';

const REC_ICON: Record<string, string> = {
  reorder: '📦',
  reduce_orders: '📉',
  opportunity: '🚀',
  investigate: '🔍',
};

const REC_COLOR: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function AIRecommendations() {
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { business } = useAuthStore();

  const load = async () => {
    setLoading(true);
    try {
      const r = await recommendations.list();
      setRecs(r.data.recommendations);
    } catch {
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      {business?.is_demo && <div className="demo-banner">⚡ Viewing demo data</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="section-title">AI Recommendations</h1>
          <p className="section-subtitle">Data-driven actions based on your actual business performance</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <span className="loading-spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : recs.length === 0 ? (
        <div className="card empty-state">
          <h3>No recommendations yet</h3>
          <p>Upload data or load the demo to get AI-powered business recommendations.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {recs.map((rec, i) => (
            <div key={i} className={styles.recCard} style={{ borderLeftColor: REC_COLOR[rec.priority] }}>
              <div className={styles.recHeader}>
                <span className={styles.recIcon}>{REC_ICON[rec.rec_type] || '💡'}</span>
                <span className={`badge badge-${rec.priority}`}>{rec.priority.toUpperCase()} PRIORITY</span>
              </div>
              <div className={styles.recTitle}>{rec.title}</div>
              <div className={styles.recDesc}>{rec.description}</div>
              {rec.metric_value !== null && rec.metric_label && (
                <div className={styles.recMetric}>
                  <span className={styles.metricVal}>{Math.round(rec.metric_value)}</span>
                  <span className={styles.metricLbl}>{rec.metric_label}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
