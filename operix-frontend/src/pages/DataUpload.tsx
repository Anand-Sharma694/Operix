import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { data as dataApi, demo } from '../api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';
import { Upload, CheckCircle } from 'lucide-react';
import styles from './DataUpload.module.css';

const FIELD_OPTIONS = ['product_name','date','quantity','unit_price','stock','-- skip --'];

export default function DataUpload() {
  const [step, setStep] = useState<'upload'|'map'|'done'>('upload');
  const [fileId, setFileId] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [, setPreview] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string,string>>({});
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const { business, setBusiness } = useAuthStore();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    multiple: false,
    onDrop: async (files) => {
      if (!files[0]) return;
      setUploading(true);
      try {
        const r = await dataApi.upload(files[0]);
        setFileId(r.data.file_id);
        setColumns(r.data.columns);
        setPreview(r.data.preview);
        const autoMap: Record<string,string> = {};
        r.data.columns.forEach((col: string) => {
          const low = col.toLowerCase();
          if (low.includes('product') || low.includes('name') || low.includes('item')) autoMap[col] = 'product_name';
          else if (low.includes('date') || low.includes('day') || low.includes('time')) autoMap[col] = 'date';
          else if (low.includes('qty') || low.includes('quantity') || low.includes('unit') || low.includes('sold')) autoMap[col] = 'quantity';
          else if (low.includes('price') || low.includes('revenue') || low.includes('amount') || low.includes('value')) autoMap[col] = 'unit_price';
          else if (low.includes('stock') || low.includes('inventory') || low.includes('balance')) autoMap[col] = 'stock';
          else autoMap[col] = '-- skip --';
        });
        setMapping(autoMap);
        setStep('map');
        toast.success(`Detected ${r.data.total_rows} rows`);
      } catch (e: any) {
        toast.error(e.response?.data?.error || 'Upload failed');
      } finally { setUploading(false); }
    },
  });

  const handleImport = async () => {
    const cleanMapping: Record<string,string> = {};
    Object.entries(mapping).forEach(([col, field]) => { if (field !== '-- skip --') cleanMapping[field] = col; });
    if (!cleanMapping.product_name || !cleanMapping.date || !cleanMapping.quantity) {
      toast.error('Must map: Product Name, Date, and Quantity'); return;
    }
    setImporting(true);
    try {
      const r = await dataApi.import(fileId, cleanMapping);
      setResult(r.data); setStep('done');
      toast.success(`Imported ${r.data.imported} records!`);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Import failed'); }
    finally { setImporting(false); }
  };

  const loadDemo = async () => {
    setDemoLoading(true);
    try {
      const r = await demo.seed();
      setBusiness(r.data.business);
      toast.success('Demo data loaded!');
    } catch { toast.error('Failed to load demo'); }
    finally { setDemoLoading(false); }
  };

  return (
    <div>
      {business?.is_demo && <div className="demo-banner">⚡ Viewing demo data</div>}
      <h1 className="section-title">Data Management</h1>
      <p className="section-subtitle">Upload CSV or Excel files, or load the demo dataset</p>

      <div className={styles.grid}>
        {/* Upload Panel */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Upload Sales Data</div>
          {step === 'upload' && (
            <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
              <input {...getInputProps()} />
              <Upload size={32} color="#4f8ef7" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>CSV or Excel (.xlsx) — max 10 MB</div>
              {uploading && <div style={{ marginTop: 10 }}><span className="loading-spinner" /></div>}
            </div>
          )}

          {step === 'map' && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Map your file columns to Operix fields. Required: Product Name, Date, Quantity.</div>
              <table className={styles.mapTable}>
                <thead><tr><th>Your Column</th><th>Maps To</th></tr></thead>
                <tbody>
                  {columns.map(col => (
                    <tr key={col}>
                      <td style={{ fontWeight: 500 }}>{col}</td>
                      <td>
                        <select className="form-select" style={{ padding: '6px 10px' }} value={mapping[col] || '-- skip --'}
                          onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}>
                          {FIELD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setStep('upload')}>Back</button>
                <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                  {importing ? <span className="loading-spinner" /> : 'Import Data'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className={styles.resultBox}>
              <CheckCircle size={32} color="#10b981" />
              <div style={{ fontWeight: 600, fontSize: 16, margin: '10px 0 4px' }}>Import Complete</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{result.message}</div>
              {result.validation_errors?.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#f87171' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{result.validation_errors.length} validation errors:</div>
                  {result.validation_errors.slice(0, 5).map((e: any, i: number) => (
                    <div key={i}>Row {e.line}: {e.error}</div>
                  ))}
                </div>
              )}
              <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={() => { setStep('upload'); setResult(null); }}>Upload Another</button>
            </div>
          )}
        </div>

        {/* Demo Panel */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Demo Dataset</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Load 6 months of realistic retail sales data for 10 products (Wireless Headphones, Smart Watch, Earbuds, and more).</p>
          <div className={styles.demoProducts}>
            {['Wireless Headphones','Bluetooth Speaker','Smart Watch','USB-C Cable','Power Bank','Keyboard','Mouse','Laptop Stand','Webcam','Earbuds'].map(p => (
              <span key={p} className={styles.productTag}>{p}</span>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadDemo} disabled={demoLoading}>
            {demoLoading ? <span className="loading-spinner" /> : '⚡ Load Demo Data'}
          </button>
        </div>

        {/* CSV Template */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>CSV Template</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Your CSV should include these columns:</p>
          <div className={styles.templateCols}>
            {['product_name', 'sale_date', 'quantity', 'unit_price', 'stock_level'].map(c => (
              <code key={c} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--accent)' }}>{c}</code>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Dates accepted: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</div>
        </div>
      </div>
    </div>
  );
}
