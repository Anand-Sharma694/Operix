import { useEffect, useState } from 'react';
import { inventory } from '../api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';
import styles from './Inventory.module.css';

const STATUS_LABEL: Record<string, string> = {
  healthy: 'Healthy',
  low_stock: 'Low Stock',
  critical: 'Critical',
  overstock: 'Overstock',
};

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { business } = useAuthStore();

  useEffect(() => {
    inventory.list()
      .then(r => setItems(r.data.inventory))
      .catch(() => toast.error('Failed to load inventory'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  const counts = {
    all: items.length,
    healthy: items.filter(i => i.status === 'healthy').length,
    low_stock: items.filter(i => i.status === 'low_stock').length,
    critical: items.filter(i => i.status === 'critical').length,
    overstock: items.filter(i => i.status === 'overstock').length,
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <span className="loading-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div>
      {business?.is_demo && <div className="demo-banner">⚡ Viewing demo data</div>}
      <h1 className="section-title">Inventory Intelligence</h1>
      <p className="section-subtitle">Stock status, reorder suggestions, and demand-based analysis</p>

      <div className={styles.filterBar}>
        {(['all', 'critical', 'low_stock', 'overstock', 'healthy'] as const).map(s => (
          <button
            key={s}
            className={`${styles.filterBtn} ${filter === s ? styles.active : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s]}
            <span className={styles.filterCount}>{counts[s]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <h3>No products found</h3>
          <p>Upload data or load demo to see inventory analysis.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(item => (
            <div key={item.id} className={`${styles.card} ${styles[`card_${item.status}`]}`}>
              <div className={styles.cardHeader}>
                <span className={styles.productName}>{item.name}</span>
                <span className={`badge badge-${item.status}`}>{STATUS_LABEL[item.status]}</span>
              </div>
              {item.category && <div className={styles.category}>{item.category}</div>}

              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <span className={styles.metricVal}>{item.current_stock}</span>
                  <span className={styles.metricLbl}>Current Stock</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricVal}>{item.avg_daily_sales || '—'}</span>
                  <span className={styles.metricLbl}>Avg Daily Sales</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricVal}>{item.days_remaining !== null ? `${item.days_remaining}d` : '—'}</span>
                  <span className={styles.metricLbl}>Days Remaining</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricVal}>{item.reorder_level}</span>
                  <span className={styles.metricLbl}>Reorder Level</span>
                </div>
              </div>

              {(item.status === 'low_stock' || item.status === 'critical') && item.avg_daily_sales > 0 && (
                <div className={styles.recommendation}>
                  💡 Consider ordering approximately <strong>{item.suggested_reorder} units</strong> to cover the next 30 days.
                </div>
              )}
              {item.status === 'overstock' && (
                <div className={styles.recommendationBlue}>
                  💡 Inventory is high relative to demand. Consider pausing new orders.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
