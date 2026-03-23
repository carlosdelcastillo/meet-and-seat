import { NavLink } from 'react-router-dom';
import { Calendar, LayoutDashboard, Settings, User, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';
import { useTranslation } from '../../i18n';
import { Avatar } from '../ui/Avatar';

export function Sidebar() {
  const { user } = useAuth();
  const { brand } = useBrand();
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {brand.logo_url ? (
          <img src={brand.logo_url} alt={brand.company_name} className="sidebar-logo" />
        ) : (
          <Building2 size={28} style={{ color: 'var(--color-primary)' }} />
        )}
        <span className="sidebar-brand">{brand.company_name}</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <Calendar size={20} />
          {t('nav.bookings')}
        </NavLink>
        <NavLink to="/my-bookings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <User size={20} />
          {t('nav.myBookings')}
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <LayoutDashboard size={20} />
          {t('nav.dashboard')}
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/admin" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <Settings size={20} />
            {t('nav.admin')}
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <Avatar name={user.full_name ?? user.email} email={user.email} />
          )}
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.full_name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
