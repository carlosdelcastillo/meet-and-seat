import { Calendar, Clock, DoorOpen, Monitor, Trophy } from 'lucide-react';
import type { DashboardStats } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface MyStatsPanelProps {
  stats: DashboardStats;
}

interface BenchmarkRowProps {
  label: string;
  myCount: number;
  top: { name: string; count: number } | null;
}

function BenchmarkRow({ label, myCount, top }: BenchmarkRowProps) {
  const isLeading = top ? myCount >= top.count : false;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ width: '80px', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: isLeading ? 'var(--color-primary)' : 'var(--color-text)',
        }}>
          {myCount}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>reservas mías</span>
      </div>
      {top && top.count > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <Trophy size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{top.name.split(' ')[0]}</span>
          <span>{top.count}</span>
        </div>
      )}
    </div>
  );
}

export function MyStatsPanel({ stats }: MyStatsPanelProps) {
  const { user } = useAuth();

  const personalCards = [
    {
      label: 'Reservas totales',
      value: stats.my_total_bookings,
      Icon: Calendar,
    },
    {
      label: 'Horas reservadas',
      value: `${stats.my_total_hours}h`,
      Icon: Clock,
    },
    {
      label: 'Salas distintas',
      value: stats.my_rooms_count,
      Icon: DoorOpen,
    },
    {
      label: 'Puestos distintos',
      value: stats.my_desks_count,
      Icon: Monitor,
    },
  ];

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          Mis reservas
        </h3>
        {user?.full_name && (
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {user.full_name}{user.department ? ` · ${user.department}` : ''}
          </div>
        )}
      </div>

      {/* Totals row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {personalCards.map(({ label, value, Icon }) => (
          <div key={label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--color-surface)', borderRadius: '10px' }}>
            <div style={{ color: 'var(--color-primary)', marginBottom: '6px' }}>
              <Icon size={18} />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Benchmarks */}
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        Actividad · comparativa
      </div>
      <BenchmarkRow label="Hoy" myCount={stats.my_today} top={stats.benchmark_today} />
      <BenchmarkRow label="Semana" myCount={stats.my_week} top={stats.benchmark_week} />
      <BenchmarkRow label="Mes" myCount={stats.my_month} top={stats.benchmark_month} />
    </div>
  );
}
