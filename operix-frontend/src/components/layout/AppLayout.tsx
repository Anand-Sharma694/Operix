import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import {
  LayoutDashboard, TrendingUp, Package, BarChart2, AlertTriangle,
  Lightbulb, MessageSquare, Upload, Settings, LogOut, Menu, X, Zap
} from 'lucide-react';
import styles from './AppLayout.module.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sales', icon: TrendingUp, label: 'Sales' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/forecast', icon: BarChart2, label: 'Forecasts' },
  { to: '/risks', icon: AlertTriangle, label: 'Risks' },
  { to: '/recommendations', icon: Lightbulb, label: 'AI Recommendations' },
  { to: '/assistant', icon: MessageSquare, label: 'Operix Assistant' },
  { to: '/data', icon: Upload, label: 'Data' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, business, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}><Zap size={16} color="#fff" /></div>
            <span>Operix AI</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {business && (
          <div className={styles.bizInfo}>
            <div className={styles.bizName}>{business.name}</div>
            <div className={styles.bizType}>{business.category}</div>
            {business.is_demo && <span className={styles.demoPill}>Demo</span>}
          </div>
        )}

        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.full_name?.charAt(0) || 'U'}</div>
            <div>
              <div className={styles.userName}>{user?.full_name}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        <header className={styles.header}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className={styles.headerLogo}>
            <Zap size={14} color="#3b82f6" />
            <span>Operix AI</span>
          </div>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
