import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics, sales, risks, demo } from '../api';
import { useAuthStore } from '../store/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, DollarSign, ShoppingCart, Play, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Dashboard.module.css';

interface KPIs {
  health_score: number;
  revenue_30d: number;
  revenue_prev_30d: number;
  revenue_growth: number | null;
  units_30d: number;
  orders_30d: number;
  total_inventory: number;
  low_stock_count: number;
  business: { name: string; is_demo: boolean };
}

function KPICard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon} style={{ background: `${color}18` }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div className={styles.kpiValue}>{value}</div>
        <div className={styles.kpiLabel}>{label}</div>
        {sub && <div className={styles.kpiSub}>{sub}</div>}
      </div>
    </div>
  );
}

function HealthScore({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className={styles.healthCard}>
      <div className={styles.healthLabel}>Business Health Score</div>
      <div className={styles.healthScore} style={{ color }}>
        {score}<span>/100</span>
      </div>
      <div className={styles.healthBar}>
        <div className={styles.healthFill} style={{ width: `${score}%`, background: color }} />
      </div>
      <div className={styles.healthDesc}>
        {score >= 75 ? 'Your business is in strong shape.' : score >= 50 ? 'Some areas need attention.' : 'Several risks detected. Review priorities below.'}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [riskList, setRiskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const { business, setBusiness } = useAuthStore();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpiRes, trendRes, riskRes] = await Promise.all([
        analytics.dashboard(),
        sales.trend(30),
        risks.list(),
      ]);
      setKpis(kpiRes.data);
      setTrend(trendRes.data.trend.map((r: any) => ({
        date: new Date(r.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(parseFloat(r.total_revenue)),
        units: parseInt(r.total_units),
      })));
      setRiskList(riskRes.data.risks.slice(0, 5));
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = async () => {
    setDemoLoading(true);
    const tid = toast.loading('Loading demo data…');
    try {
      const res = await demo.seed();
      setBusiness(res.data.business);
      toast.success('Demo data loaded!', { id: tid });
      await loadData();
    } catch {
      toast.error('Failed to load demo', { id: tid });
    } finally {
      setDemoLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <span className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  const hasData = kpis && kpis.orders_30d > 0;
  const growthPct = kpis?.revenue_growth;

  return (
    <div>
      {business?.is_demo && (
        <div className="demo-banner">
          ⚡ You are viewing demo data. <button onClick={loadDemo} className="btn btn-secondary" style={{ padding: '2px 10px', fontSize: 12, marginLeft: 8 }}>Reload Demo</button>
        </div>
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Welcome back, {kpis?.business?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={loadData}><RefreshCw size={14} /> Refresh</button>
          {!business?.is_demo && !hasData && (
            <button className="btn btn-primary" onClick={loadDemo} disabled={demoLoading}>
              <Play size={14} /> Load Demo Data
            </button>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="empty-state">
            <h3>No data yet</h3>
            <p>Upload your sales data or load the demo to see insights.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={loadDemo} disabled={demoLoading}>
                <Play size={14} /> Load Demo Data
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/data')}>Upload Data</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Health + KPIs */}
          <div className={styles.topRow}>
            <HealthScore score={kpis!.health_score} />
            <div className={styles.kpiGrid}>
              <KPICard icon={DollarSign} label="Revenue (30d)" value={`$${kpis!.revenue_30d.toLocaleString()}`}
                sub={growthPct != null ? `${growthPct >= 0 ? '+' : ''}${growthPct}% vs prev period` : undefined}
                color="#4f8ef7" />
              <KPICard icon={ShoppingCart} label="Orders (30d)" value={kpis!.orders_30d.toLocaleString()} color="#10b981" />
              <KPICard icon={TrendingUp} label="Units Sold (30d)" value={kpis!.units_30d.toLocaleString()} color="#8b5cf6" />
              <KPICard icon={Package} label="Total Inventory" value={kpis!.total_inventory.toLocaleString()}
                sub={kpis!.low_stock_count > 0 ? `${kpis!.low_stock_count} low stock` : undefined}
                color="#f59e0b" />
            </div>
          </div>

          {/* Revenue Chart */}
          {trend.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>Revenue Trend — Last 30 Days</span>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={50} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', boxShadow: '0 4px 12px rgba(15,21,35,0.1)' }} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Priority Actions */}
          {riskList.length > 0 && (
            <div className="card">
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>Today's Priority Actions</span>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/risks')}>View All Risks</button>
              </div>
              <div className={styles.priorityList}>
                {riskList.map((risk, i) => (
                  <div key={i} className={styles.priorityItem}>
                    <span className={`status-dot status-dot-${risk.severity}`} style={{ flexShrink: 0, marginTop: 6 }} />
                    <div>
                      <div className={styles.priorityTitle}>{risk.title}</div>
                      <div className={styles.priorityReason}>{risk.reason}</div>
                      <div className={styles.priorityAction}>→ {risk.recommended_action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
