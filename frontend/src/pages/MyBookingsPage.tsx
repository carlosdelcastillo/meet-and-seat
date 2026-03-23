import { useEffect, useState } from 'react';
import { useBookings } from '../hooks/useBookings';
import { BookingCard } from '../components/booking/BookingCard';
import { BookingForm } from '../components/booking/BookingForm';
import { Spinner } from '../components/ui/Spinner';
import { useTranslation } from '../i18n';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Booking, User } from '../types';
import { translateApiError } from '../utils/apiErrors';

export function MyBookingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { bookings, loading, fetchMine, fetchByUser, deleteBooking, updateBooking, deleteAllUserBookings } = useBookings();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (isAdmin) {
      api.get<User[]>('/users').then(setUsers).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedUserId) {
      fetchByUser(selectedUserId);
    } else {
      fetchMine();
    }
  }, [selectedUserId, fetchMine, fetchByUser]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('booking.deleteConfirm'))) return;
    try {
      await deleteBooking(id);
      showToast(t('booking.deleted'));
      selectedUserId ? fetchByUser(selectedUserId) : fetchMine();
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    }
  };

  const handleDeleteAllBookings = async () => {
    if (!selectedUserId) return;
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!confirm(t('admin.deleteUserBookingsConfirm', { name: selectedUser?.full_name ?? '' }))) return;
    try {
      await deleteAllUserBookings(selectedUserId);
      showToast(t('admin.userBookingsDeleted'));
      fetchByUser(selectedUserId);
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    }
  };

  const handleUpdate = async (data: { booking_date: string; start_time: string; end_time: string; purpose: string }) => {
    if (!editingBooking) return;
    await updateBooking(editingBooking.id, data);
    showToast(t('booking.updated'));
    selectedUserId ? fetchByUser(selectedUserId) : fetchMine();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h1>{t('booking.myBookings')}</h1>
      </div>

      {isAdmin && users.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <select
            className="input"
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            <option value="">{t('admin.viewOwnBookings')}</option>
            {users.filter(u => u.id !== user?.id).map(u => (
              <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
            ))}
          </select>
          {selectedUserId && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteAllBookings}>
              {t('admin.deleteAllBookings')}
            </button>
          )}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <h3>{t('booking.noBookings')}</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {bookings.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              canDelete
              canEdit={!selectedUserId || isAdmin}
              onDelete={handleDelete}
              onEdit={setEditingBooking}
            />
          ))}
        </div>
      )}

      {editingBooking && (
        <BookingForm
          resources={[]}
          editBooking={editingBooking}
          onSubmit={async () => {}}
          onUpdate={handleUpdate}
          onClose={() => setEditingBooking(null)}
        />
      )}
    </div>
  );
}
