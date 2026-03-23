import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '../../i18n';

interface Props {
  data: Array<{ name: string; type: string; count: number }>;
}

export function TopResourcesChart({ data }: Props) {
  const { t } = useTranslation();

  return (
    <div className="card chart-card">
      <h3>{t('dashboard.mostBooked')}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" fontSize={11} tick={{ fill: 'var(--color-text-muted)' }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: 'var(--color-text-secondary)' }} width={120} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '0.8125rem',
            }}
          />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
