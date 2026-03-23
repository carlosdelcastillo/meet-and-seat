import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTranslation } from '../../i18n';

interface Props {
  data: Array<{ hour: number; count: number }>;
}

export function BookingsByHourChart({ data }: Props) {
  const { t } = useTranslation();

  const formatted = data.map(d => ({
    ...d,
    label: `${d.hour}:00`,
  }));

  return (
    <div className="card chart-card">
      <h3>{t('dashboard.bookingsByHour')}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={formatted}>
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
          <Area type="monotone" dataKey="count" fill="var(--color-accent)" fillOpacity={0.2} stroke="var(--color-primary)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
