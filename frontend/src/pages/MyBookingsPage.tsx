import { useEffect, useMemo, useState } from 'react';
import { useBookings } from '../hooks/useBookings';
import { BookingCard } from '../components/booking/BookingCard';
import { BookingForm } from '../components/booking/BookingForm';
import { Spinner } from '../components/ui/Spinner';
import { useTranslation } from '../i18n';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Booking, BookingSortBy, MyBookingsParams, User } from '../types';
import { translateApiError } from '../utils/apiErrors';

const DEFAULT_PARAMS: MyBookingsParams = {
  page: 1,
  per_page: 20,
  sort_by: 'booking_date',
  sort_dir: 'desc',
};

export function MyBookingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { bookings, loading, paginatedMeta, fetchMine, fetchByUser, deleteBooking, updateBooking, deleteAllUserBookings } = useBookings();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [params, setParams] = useState<MyBookingsParams>(DEFAULT_PARAMS);

  // Local input drafts — prevent a fetch on every keystroke
  const [resourceNameInput, setResourceNameInput] = useState('');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');

  // Debounce resource name: update params 400 ms after the user stops typing
  useEffect(() => {
    const trimmed = resourceNameInput.trim() || undefined;
    const timer = setTimeout(() => {
      setParams(p => {
        if (p.resource_name === trimmed) return p;
        return { ...p, resource_name: trimmed, page: 1 };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [resourceNameInput]);

  useEffect(() => {
    if (isAdmin) {
      api.get<User[]>('/users').then(setUsers).catch(() => {});
    }
  }, [isAdmin]);

  // Serialize params so the effect only fires on actual value changes
  const paramKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    if (selectedUserId) {
      fetchByUser(selectedUserId, params);
    } else {
      fetchMine(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, paramKey, fetchByUser]);

  // When switching to own view, reset to page 1
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    if (!userId) setParams(p => ({ ...p, page: 1 }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('booking.deleteConfirm'))) return;
    try {
      await deleteBooking(id);
      showToast(t('booking.deleted'));
      selectedUserId ? fetchByUser(selectedUserId, params) : fetchMine(params);
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
      fetchByUser(selectedUserId, params);
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    }
  };

  const handleUpdate = async (data: { booking_date: string; start_time: string; end_time: string; purpose: string }) => {
    if (!editingBooking) return;
    await updateBooking(editingBooking.id, data);
    showToast(t('booking.updated'));
    selectedUserId ? fetchByUser(selectedUserId, params) : fetchMine(params);
  };

  const setFilter = (patch: Partial<MyBookingsParams>) =>
    setParams(p => ({ ...p, ...patch, page: 1 }));

  const hasActiveFilters = !!(dateFromInput || dateToInput || params.resource_type || resourceNameInput);

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
            onChange={e => handleUserSelect(e.target.value)}
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

      {/* Filter & sort bar */}
      {(
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
          marginBottom: '16px', padding: '12px',
          background: 'var(--color-surface)', borderRadius: '8px',
          border: '1px solid var(--color-border)',
        }}>
          <input
            type="date"
            className="input"
            style={{ maxWidth: '150px' }}
            value={dateFromInput}
            onChange={e => setDateFromInput(e.target.value)}
            onBlur={e => setFilter({ date_from: e.target.value || undefined })}
            title={t('booking.filterFrom')}
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>→</span>
          <input
            type="date"
            className="input"
            style={{ maxWidth: '150px' }}
            value={dateToInput}
            onChange={e => setDateToInput(e.target.value)}
            onBlur={e => setFilter({ date_to: e.target.value || undefined })}
            title={t('booking.filterTo')}
          />
          <input
            type="text"
            className="input"
            style={{ maxWidth: '180px' }}
            placeholder={t('booking.filterResourceName')}
            value={resourceNameInput}
            onChange={e => setResourceNameInput(e.target.value)}
          />
          <select
            className="input"
            style={{ maxWidth: '130px' }}
            value={params.resource_type ?? ''}
            onChange={e => setFilter({ resource_type: (e.target.value as 'room' | 'desk') || undefined })}
          >
            <option value="">{t('booking.filterAll')}</option>
            <option value="room">{t('booking.rooms')}</option>
            <option value="desk">{t('booking.desks')}</option>
          </select>
          <select
            className="input"
            style={{ maxWidth: '160px' }}
            value={params.sort_by ?? 'booking_date'}
            onChange={e => setFilter({ sort_by: e.target.value as BookingSortBy })}
          >
            <option value="booking_date">{t('booking.sortDate')}</option>
            <option value="start_time">{t('booking.sortTime')}</option>
            <option value="resource_name">{t('booking.sortResource')}</option>
            <option value="created_at">{t('booking.sortCreated')}</option>
          </select>
          <button
            className="btn btn-secondary btn-sm"
            title={params.sort_dir === 'asc' ? t('booking.sortAsc') : t('booking.sortDesc')}
            onClick={() => setFilter({ sort_dir: params.sort_dir === 'asc' ? 'desc' : 'asc' })}
          >
            {params.sort_dir === 'asc' ? '↑' : '↓'}
          </button>
          {hasActiveFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setResourceNameInput('');
                setDateFromInput('');
                setDateToInput('');
                setParams(p => ({ ...DEFAULT_PARAMS, sort_by: p.sort_by, sort_dir: p.sort_dir, per_page: p.per_page }));
              }}
            >
              ✕ {t('common.clearFilters')}
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

      {/* Pagination controls */}
      {paginatedMeta && paginatedMeta.total_pages > 0 && (
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap',
        }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={(params.page ?? 1) <= 1}
            onClick={() => setParams(p => ({ ...p, page: (p.page ?? 1) - 1 }))}
          >
            ‹ {t('common.prev')}
          </button>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {t('booking.page')} {paginatedMeta.page} {t('common.of')} {paginatedMeta.total_pages}
            &nbsp;·&nbsp;{paginatedMeta.total} {t('booking.totalResults')}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={(params.page ?? 1) >= paginatedMeta.total_pages}
            onClick={() => setParams(p => ({ ...p, page: (p.page ?? 1) + 1 }))}
          >
            {t('common.next')} ›
          </button>
          <select
            className="input"
            style={{ width: '72px' }}
            value={params.per_page ?? 20}
            onChange={e => setParams(p => ({ ...p, per_page: Number(e.target.value), page: 1 }))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
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

