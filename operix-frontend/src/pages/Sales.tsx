import { useEffect, useState } from 'react';
import { sales } from '../api';
import { useAuthStore } from '../store/auth';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import styles from './Sales.module.css';

const PERIODS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
];

export default function Sales() {
  const [period, setPeriod] = useState(30);
  const [trend, setTrend] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { business } = useAuthStore();

  const loadData = async (days: number) => {
    setLoading(true);
    try {
      const [trendRes, prodRes] = await Promise.all([
        sales.trend(days),
        sales.byProduct(days),
      ]);
      setTrend(trendRes.data.trend.map((r: any) => ({
        date: new Date(r.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(parseFloat(r.total_revenue)),
        units: parseInt(r.total_units),
      })));
      setProducts(prodRes.data.products);
    } catch {
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(period); }, [period]);

  const totalRevenue = products.reduce((s, p) => s + parseFloat(p.total_revenue || 0), 0);
  const totalUnits = products.reduce((s, p) => s + parseInt(p.total_units || 0), 0);
  const top5 = [...products].slice(0, 5);
  const bottom5 = [...products].reverse().slice(0, 5).reverse();

  return (
    <div>
      {business?.is_demo && <div className="demo-banner">⚡ Viewing demo data</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="section-title">Sales Intelligence</h1>
          <p className="section-subtitle">Revenue trends, product performance, and growth analysis</p>
        </div>
        <div className={styles.periodBar}>
          {PERIODS.map(p => (
            <button
              key={p.days}
              className={`${styles.periodBtn} ${period === p.days ? styles.active : ''}`}
              onClick={() => setPeriod(p.days)}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <span className="loading-spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : trend.length === 0 ? (
        <div className="card empty-state">
          <h3>No sales data for this period</h3>
          <p>Upload data or load the demo to see sales insights.</p>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className={styles.kpiRow}>
            <div className={styles.kpiBox}>
              <div className={styles.kpiVal}>${totalRevenue.toLocaleString()}</div>
              <div className={styles.kpiLbl}>Total Revenue</div>
            </div>
            <div className={styles.kpiBox}>
              <div className={styles.kpiVal}>{totalUnits.toLocaleString()}</div>
              <div className={styles.kpiLbl}>Units Sold</div>
            </div>
            <div className={styles.kpiBox}>
              <div className={styles.kpiVal}>{products.length}</div>
              <div className={styles.kpiLbl}>Products Active</div>
            </div>
          </div>

          {/* Revenue Line Chart */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>Revenue Over Time</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                  interval={Math.floor(trend.length / 6)} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={52} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', boxShadow: '0 4px 12px rgba(15,21,35,0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2.5} dot={false} name="Revenue ($)" activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Units Bar Chart */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>Units Sold Over Time</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                  interval={Math.floor(trend.length / 6)} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', boxShadow: '0 4px 12px rgba(15,21,35,0.1)' }} />
                <Bar dataKey="units" fill="var(--purple)" radius={[4, 4, 0, 0]} name="Units" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className={styles.prodRow}>
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, color: 'var(--text)' }}>Top Products</div>
              <table>
                <thead>
                  <tr><th>Product</th><th>Revenue</th><th>Units</th></tr>
                </thead>
                <tbody>
                  {top5.map((p, i) => (
                    <tr key={p.id}>
                      <td><span style={{ color: 'var(--accent)', marginRight: 8, fontWeight: 700 }}>#{i + 1}</span>{p.name}</td>
                      <td>${parseFloat(p.total_revenue).toLocaleString()}</td>
                      <td>{p.total_units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, color: 'var(--danger)' }}>Lowest Performers</div>
              <table>
                <thead>
                  <tr><th>Product</th><th>Revenue</th><th>Units</th></tr>
                </thead>
                <tbody>
                  {bottom5.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>${parseFloat(p.total_revenue).toLocaleString()}</td>
                      <td>{p.total_units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
