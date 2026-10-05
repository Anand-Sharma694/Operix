import { useEffect, useState } from 'react';
import { forecast, inventory } from '../api';
import { useAuthStore } from '../store/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import styles from './Forecast.module.css';

const HORIZONS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

export default function Forecast() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [horizon, setHorizon] = useState(30);
  const [chartData, setChartData] = useState<any>(null);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const { business } = useAuthStore();

  useEffect(() => {
    inventory.list().then(r => {
      setProducts(r.data.inventory);
      if (r.data.inventory.length > 0) {
        setSelectedProduct(r.data.inventory[0].id);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    setChartLoading(true);
    Promise.all([
      forecast.chart(selectedProduct, horizon),
      forecast.all(horizon),
    ]).then(([chartRes, fRes]) => {
      setChartData(chartRes.data);
      setForecasts(fRes.data.forecasts);
    }).catch(() => toast.error('Failed to load forecast'))
      .finally(() => setChartLoading(false));
  }, [selectedProduct, horizon]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <span className="loading-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  // Build combined chart data
  const historicalData = chartData?.historical?.map((h: any) => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    actual: Math.round(h.quantity),
    type: 'historical',
  })) || [];

  const forecastDataPoints = chartData?.forecast?.map((f: any) => ({
    date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    forecast: Math.round(f.quantity),
    type: 'forecast',
  })) || [];

  const combinedData = [...historicalData.slice(-30), ...forecastDataPoints];

  return (
    <div>
      {business?.is_demo && <div className="demo-banner">⚡ Viewing demo data</div>}
      <h1 className="section-title">AI Demand Forecasting</h1>
      <p className="section-subtitle">Historical sales trends projected forward using linear regression analysis</p>

      <div className={styles.controls}>
        <div className={styles.productSelect}>
          <label className="form-label">Product</label>
          <select className="form-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Forecast Horizon</label>
          <div className={styles.horizonBtns}>
            {HORIZONS.map(h => (
              <button
                key={h.days}
                className={`${styles.horizonBtn} ${horizon === h.days ? styles.active : ''}`}
                onClick={() => setHorizon(h.days)}
              >{h.label}</button>
            ))}
          </div>
        </div>
      </div>

      {chartLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <span className="loading-spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : chartData?.insufficient_data ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className={styles.insufficientData}>
            <div className={styles.insufficientIcon}>📊</div>
            <h3>Insufficient Data for Forecast</h3>
            <p>{chartData.message}</p>
            <p style={{ marginTop: 8, fontSize: 12 }}>Reliable forecasting requires at least 7 days of sales history per product. Continue collecting data and check back soon.</p>
          </div>
        </div>
      ) : (
        <>
          {chartData && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className={styles.chartHeader}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{chartData.product?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Historical demand → {horizon}-day forecast
                    {chartData.trend && <span className={styles.trendBadge}>{chartData.trend === 'increasing' ? '↑ Increasing' : chartData.trend === 'decreasing' ? '↓ Decreasing' : '→ Stable'}</span>}
                  </div>
                </div>
                <div className={styles.statChip}>
                  <span>Avg Daily: <strong>{chartData.avg_daily}</strong> units</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={combinedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                    interval={Math.floor(combinedData.length / 8)} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', boxShadow: '0 4px 12px rgba(15,21,35,0.1)' }} />
                  <Line type="monotone" dataKey="actual" stroke="var(--accent)" strokeWidth={2.5} dot={false} name="Actual" connectNulls />
                  <Line type="monotone" dataKey="forecast" stroke="var(--success)" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Forecast" connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                <span className={styles.legendItem}><span style={{ background: 'var(--accent)' }} className={styles.legendDot} />Historical</span>
                <span className={styles.legendItem}><span style={{ background: 'var(--success)' }} className={styles.legendDot} />Forecast (dashed)</span>
              </div>
              <div className={styles.disclaimer}>
                ⚠️ Forecasts are estimates based on historical trends and should not be treated as guarantees. Model: Linear Regression.
              </div>
            </div>
          )}

          {/* All Products Summary */}
          {forecasts.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>All Products — {horizon}-Day Forecast Summary</div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Predicted Demand</th>
                    <th>Avg Daily</th>
                    <th>Trend</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f: any) => (
                    <tr key={f.product_id} style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedProduct(f.product_id)}>
                      <td style={{ fontWeight: 500 }}>{f.product_name}</td>
                      <td>{f.insufficient_data ? <span style={{ color: 'var(--text-muted)' }}>Insufficient data</span> : `${f.predicted_total} units`}</td>
                      <td>{f.insufficient_data ? '—' : `${f.avg_daily}/day`}</td>
                      <td>{f.insufficient_data ? '—' : (
                        <span style={{ color: f.trend === 'increasing' ? 'var(--success)' : f.trend === 'decreasing' ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {f.trend === 'increasing' ? '↑' : f.trend === 'decreasing' ? '↓' : '→'} {f.trend}
                        </span>
                      )}</td>
                      <td>{f.insufficient_data ? '—' : <span className={`badge badge-${f.confidence === 'high' ? 'low' : f.confidence === 'medium' ? 'medium' : 'high'}`}>{f.confidence}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
