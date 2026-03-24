import { useTranslation } from '../../i18n';

interface Props {
  data: Array<{ name: string; department: string; count: number }>;
}

export function TopUsersTable({ data }: Props) {
  const { t } = useTranslation();

  return (
    <div className="card chart-card">
      <h3>{t('dashboard.topUsers')}</h3>
      <table className="table">
        <thead>
          <tr>
            <th>{t('admin.name')}</th>
            <th>{t('auth.department')}</th>
            <th style={{ textAlign: 'right' }}>{t('dashboard.totalBookings')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map(user => (
            <tr key={user.name}>
              <td style={{ fontWeight: 500 }}>{user.name}</td>
              <td style={{ color: 'var(--color-text-secondary)' }}>{user.department}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{user.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
