import { Calendar, Clock, Users, Building2, CalendarCheck } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { DashboardStats } from '../../types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useTranslation();

  const cards = [
    { label: t('dashboard.totalBookings'), value: stats.total_bookings, Icon: Calendar },
    { label: t('dashboard.totalHours'), value: `${stats.total_hours}h`, Icon: Clock },
    { label: t('dashboard.activeUsers'), value: stats.active_users, Icon: Users },
    { label: t('dashboard.activeResources'), value: stats.active_resources, Icon: Building2 },
    { label: t('dashboard.bookingsToday'), value: stats.bookings_today, Icon: CalendarCheck },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
      {cards.map((card) => (
        <div key={card.label} className="card stat-card">
          <div className="stat-icon">
            <card.Icon size={20} />
          </div>
          <div className="stat-value">{card.value}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
