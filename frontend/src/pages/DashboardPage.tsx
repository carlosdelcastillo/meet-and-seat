import { useDashboard } from '../hooks/useDashboard';
import { MyStatsPanel } from '../components/dashboard/MyStatsPanel';
import { StatsCards } from '../components/dashboard/StatsCards';
import { BookingsByDayChart } from '../components/dashboard/BookingsByDayChart';
import { BookingsByHourChart } from '../components/dashboard/BookingsByHourChart';
import { TopResourcesChart } from '../components/dashboard/TopResourcesChart';
import { TopUsersTable } from '../components/dashboard/TopUsersTable';
import { Spinner } from '../components/ui/Spinner';
import { useTranslation } from '../i18n';

export function DashboardPage() {
  const { t } = useTranslation();
  const { stats, loading } = useDashboard();

  if (loading || !stats) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h1>{t('dashboard.title')}</h1>
      </div>

      {/* Personal stats */}
      <MyStatsPanel stats={stats} />

      {/* Org-wide KPIs */}
      <StatsCards stats={stats} />

      {/* Charts */}
      <div className="grid-2" style={{ marginTop: '24px' }}>
        <BookingsByDayChart data={stats.bookings_by_day} />
        <BookingsByHourChart data={stats.bookings_by_hour} />
      </div>

      <div className="grid-2" style={{ marginTop: '24px' }}>
        <TopResourcesChart data={stats.most_booked_resources} />
        <TopUsersTable data={stats.top_users} />
      </div>

      {/* Secondary metrics */}
      <div className="grid-2" style={{ marginTop: '24px' }}>
        <div className="card stat-card">
          <div className="stat-label">{t('dashboard.avgDuration')}</div>
          <div className="stat-value">{stats.avg_booking_duration}h</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">{t('dashboard.peakHour')}</div>
          <div className="stat-value">{stats.peak_hour !== null ? `${stats.peak_hour}:00` : '—'}</div>
        </div>
      </div>
    </div>
  );
}
