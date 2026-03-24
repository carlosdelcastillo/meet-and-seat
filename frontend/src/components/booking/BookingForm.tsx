import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { TimePicker } from '../ui/TimePicker';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import type { Resource, User } from '../../types';
import { todayStr } from '../../utils/dates';
import { translateApiError } from '../../utils/apiErrors';

const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

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
  let defaultEnd: string;
  if (editBooking) { defaultEnd = editBooking.end_time.slice(0, 5); }
  else if (initialStartTime) { defaultEnd = addMinutes(initialStartTime, 60); }
  else { defaultEnd = '19:00'; }
  const [resourceId, setResourceId] = useState(editBooking?.resource_id ?? initialResourceId);
  const [resourceSearch, setResourceSearch] = useState('');
  const [showResourceDropdown, setShowResourceDropdown] = useState(false);
  const resourceDropdownRef = useRef<HTMLDivElement>(null);
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

  // Initialize resourceSearch label when editing or when initialResourceId is pre-set
  useEffect(() => {
    if (resourceId) {
      const r = resources.find(res => res.id === resourceId);
      if (r) setResourceSearch(`${r.name} (${t('booking.' + r.resource_type)})`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showResourceDropdown) return;
    const handler = (e: MouseEvent) => {
      if (resourceDropdownRef.current && !resourceDropdownRef.current.contains(e.target as Node)) {
        setShowResourceDropdown(false);
        // Restore label if a resource is already selected
        if (resourceId) {
          const r = resources.find(res => res.id === resourceId);
          if (r) setResourceSearch(`${r.name} (${t('booking.' + r.resource_type)})`);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showResourceDropdown, resourceId, resources, t]);

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
            <div ref={resourceDropdownRef} style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder={t('booking.selectResource')}
                value={resourceSearch}
                onFocus={() => {
                  setResourceSearch('');
                  setShowResourceDropdown(true);
                }}
                onChange={e => {
                  setResourceSearch(e.target.value);
                  setShowResourceDropdown(true);
                }}
                autoComplete="off"
                required={!resourceId}
              />
              {/* hidden input to satisfy required validation */}
              <input type="hidden" value={resourceId} required />
              {showResourceDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  marginTop: '2px',
                }}>
                  {resources
                    .filter(r => !resourceSearch || normalize(r.name).includes(normalize(resourceSearch)))
                    .map(r => (
                      <div
                        key={r.id}
                        role="option"
                        aria-selected={r.id === resourceId}
                        tabIndex={0}
                        onMouseDown={() => {
                          setResourceId(r.id);
                          setResourceSearch(`${r.name} (${t(`booking.${r.resource_type}`)})`);
                          setShowResourceDropdown(false);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setResourceId(r.id);
                            setResourceSearch(`${r.name} (${t(`booking.${r.resource_type}`)})`);
                            setShowResourceDropdown(false);
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          background: r.id === resourceId ? 'var(--color-hover)' : 'transparent',
                          fontSize: '0.9rem',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = r.id === resourceId ? 'var(--color-hover)' : 'transparent')}
                      >
                        <span style={{ fontWeight: 500 }}>{r.name}</span>
                        <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px', fontSize: '0.8rem' }}>
                          {t(`booking.${r.resource_type}`)}
                        </span>
                      </div>
                    ))}
                  {resources.filter(r => !resourceSearch || normalize(r.name).includes(normalize(resourceSearch))).length === 0 && (
                    <div style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {t('common.noResults')}
                    </div>
                  )}
                </div>
              )}
            </div>
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
            {loading ? t('common.loading') : (isEdit ? t('common.save') : t('common.create'))}
          </button>
        </div>
      </form>
    </Modal>
  );
}
