import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { TimePicker } from '../ui/TimePicker';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import type { Resource, User } from '../../types';
import { todayStr } from '../../utils/dates';
import { translateApiError } from '../../utils/apiErrors';

interface BookingFormProps {
  resources: Resource[];
  initialResourceId?: string;
  initialDate?: string;
  initialStartTime?: string;
  editBooking?: import('../../types').Booking;
  onSubmit: (data: {
    resource_id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    purpose: string;
    for_user_id?: string;
  }) => Promise<void>;
  onUpdate?: (data: {
    booking_date: string;
    start_time: string;
    end_time: string;
    purpose: string;
  }) => Promise<void>;
  onClose: () => void;
}

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

export function BookingForm({
  resources,
  initialResourceId = '',
  initialDate = '',
  initialStartTime = '',
  editBooking,
  onSubmit,
  onUpdate,
  onClose,
}: BookingFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isEdit = !!editBooking;

  const defaultStart = editBooking ? editBooking.start_time.slice(0, 5) : (initialStartTime || '09:00');
  const defaultEnd = editBooking ? editBooking.end_time.slice(0, 5) : (initialStartTime ? addMinutes(initialStartTime, 60) : '19:00');
  const [resourceId, setResourceId] = useState(editBooking?.resource_id ?? initialResourceId);
  const [date, setDate] = useState(editBooking?.booking_date ?? (initialDate || todayStr()));
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [purpose, setPurpose] = useState(editBooking?.purpose ?? '');
  const [forUserId, setForUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      api.get<User[]>('/users').then(setUsers).catch(() => {});
    }
  }, [isAdmin]);

  const handleStartChange = (val: string) => {
    setStartTime(val);
    // Push end forward only if it would become invalid
    if (endTime <= val) setEndTime(addMinutes(val, 15));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isEdit && onUpdate) {
        await onUpdate({
          booking_date: date,
          start_time: startTime + ':00',
          end_time: endTime + ':00',
          purpose,
        });
      } else {
        if (!resourceId) return;
        await onSubmit({
          resource_id: resourceId,
          booking_date: date,
          start_time: startTime + ':00',
          end_time: endTime + ':00',
          purpose,
          ...(isAdmin && forUserId ? { for_user_id: forUserId } : {}),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? translateApiError(err.message, t) : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? t('common.edit') : t('booking.new')} onClose={onClose}>
      <form className="login-form" onSubmit={handleSubmit}>
        {!isEdit && (
          <div className="input-group">
            <label>{t('booking.resource')}</label>
            <select className="input" value={resourceId} onChange={e => setResourceId(e.target.value)} required>
              <option value="">{t('booking.selectResource')}</option>
              {resources.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({t(`booking.${r.resource_type}`)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="input-group">
          <label>{t('booking.date')}</label>
          <input type="date" className="input" value={date} min={todayStr()} onChange={e => setDate(e.target.value)} required />
        </div>

        <div className="grid-2">
          <div className="input-group">
            <label>{t('booking.startTime')}</label>
            <TimePicker value={startTime} onChange={handleStartChange} />
          </div>
          <div className="input-group">
            <label>{t('booking.endTime')}</label>
            <TimePicker value={endTime} onChange={setEndTime} min={startTime} />
          </div>
        </div>

        <div className="input-group">
          <label>{t('booking.purpose')}</label>
          <input
            type="text"
            className="input"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder={t('booking.purpose')}
          />
        </div>

        {!isEdit && isAdmin && users.length > 0 && (
          <div className="input-group">
            <label>Reservar en nombre de</label>
            <select className="input" value={forUserId} onChange={e => setForUserId(e.target.value)}>
              <option value="">— {user?.full_name} (tú mismo) —</option>
              {users.filter(u => u.id !== user?.id).map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('common.loading') : isEdit ? t('common.save') : t('common.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
