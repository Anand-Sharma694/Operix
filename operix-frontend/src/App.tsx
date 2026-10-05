import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Forecast from './pages/Forecast';
import Risks from './pages/Risks';
import AIRecommendations from './pages/AIRecommendations';
import Assistant from './pages/Assistant';
import DataUpload from './pages/DataUpload';
import Settings from './pages/Settings';
import AppLayout from './components/layout/AppLayout';
import './index.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, business } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!business) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function SetupRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, business } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (business) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a2035', color: '#e8eaf0', border: '1px solid #2a3248' },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
        <Route path="/setup" element={<SetupRoute><Setup /></SetupRoute>} />
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/risks" element={<Risks />} />
          <Route path="/recommendations" element={<AIRecommendations />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/data" element={<DataUpload />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
