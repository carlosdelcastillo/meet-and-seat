import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTranslation } from '../../i18n';

interface Props {
  data: Array<{ date: string; count: number }>;
}

export function BookingsByDayChart({ data }: Props) {
  const { t } = useTranslation();

  const formatted = data.map(d => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="card chart-card">
      <h3>{t('dashboard.bookingsByDay')}</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: '-8px' }}>
        {t('dashboard.last30Days')}
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" fontSize={11} tick={{ fill: 'var(--color-text-muted)' }} />
          <YAxis fontSize={11} tick={{ fill: 'var(--color-text-muted)' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '0.8125rem',
            }}
          />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
