import { useEffect, useState } from 'react';
import { risks } from '../api';
import { useAuthStore } from '../store/auth';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Risks.module.css';

const RISK_TYPE_LABEL: Record<string, string> = {
  stockout: 'Stockout Risk',
  overstock: 'Overstock Risk',
  decline: 'Sales Decline',
  anomaly: 'Unusual Pattern',
  demand_change: 'Demand Change',
};

const RISK_TYPE_COLOR: Record<string, string> = {
  stockout: '#ef4444',
  overstock: '#6366f1',
  decline: '#f59e0b',
  anomaly: '#8b5cf6',
  demand_change: '#10b981',
};

export default function Risks() {
  const [riskList, setRiskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { business } = useAuthStore();

  const load = async () => {
    setLoading(true);
    try {
      const r = await risks.list();
      setRiskList(r.data.risks);
    } catch {
      toast.error('Failed to load risks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? riskList : riskList.filter(r => r.severity === filter || r.risk_type === filter);

  const highCount = riskList.filter(r => r.severity === 'high').length;
  const medCount = riskList.filter(r => r.severity === 'medium').length;

  return (
    <div>
      {business?.is_demo && <div className="demo-banner">⚡ Viewing demo data</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="section-title">Risk Center</h1>
          <p className="section-subtitle">Detected business risks based on your sales and inventory data</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Summary */}
      {riskList.length > 0 && (
        <div className={styles.summary}>
          <div className={`${styles.summaryBox} ${styles.summaryHigh}`}>
            <span className={styles.summaryNum}>{highCount}</span>
            <span className={styles.summaryLbl}>High Severity</span>
          </div>
          <div className={`${styles.summaryBox} ${styles.summaryMed}`}>
            <span className={styles.summaryNum}>{medCount}</span>
            <span className={styles.summaryLbl}>Medium Severity</span>
          </div>
          <div className={`${styles.summaryBox} ${styles.summaryAll}`}>
            <span className={styles.summaryNum}>{riskList.length}</span>
            <span className={styles.summaryLbl}>Total Risks</span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className={styles.filterBar}>
        {['all', 'high', 'medium', 'low'].map(s => (
          <button key={s} className={`${styles.fBtn} ${filter === s ? styles.active : ''}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <span className="loading-spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <h3>{riskList.length === 0 ? 'No risks detected' : 'No risks match this filter'}</h3>
          <p>{riskList.length === 0 ? 'Your business looks healthy! Risks are automatically detected from your data.' : 'Try a different filter.'}</p>
        </div>
      ) : (
        <div className={styles.riskList}>
          {filtered.map((risk, i) => (
            <div key={i} className={`${styles.riskCard} ${styles[`risk_${risk.severity}`]}`}>
              <div className={styles.riskHeader}>
                <div className={styles.riskLeft}>
                  <span className={`badge badge-${risk.severity}`}>{risk.severity.toUpperCase()}</span>
                  <span className={styles.riskType} style={{ color: RISK_TYPE_COLOR[risk.risk_type] || '#8b92a5' }}>
                    {RISK_TYPE_LABEL[risk.risk_type] || risk.risk_type}
                  </span>
                </div>
              </div>
              <div className={styles.riskTitle}>{risk.title}</div>
              <div className={styles.riskReason}>{risk.reason}</div>
              <div className={styles.riskAction}>
                <span className={styles.actionLabel}>Recommended Action</span>
                <span className={styles.actionText}>{risk.recommended_action}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
