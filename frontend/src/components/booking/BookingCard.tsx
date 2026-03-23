import { Trash2, Clock, User, MessageSquare, Edit2 } from 'lucide-react';
import type { Booking } from '../../types';
import { formatTime, formatDate } from '../../utils/dates';
import { useTranslation } from '../../i18n';

interface BookingCardProps {
  booking: Booking;
  showResource?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (booking: Booking) => void;
}

export function BookingCard({ booking, showResource = true, canDelete = false, canEdit = false, onDelete, onEdit }: BookingCardProps) {
  const { t } = useTranslation();

  return (
    <div className="card booking-card">
      <div className="booking-main">
        <div className="booking-time">
          <Clock size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
          {booking.booking_date && (
            <span>{formatDate(booking.booking_date)}</span>
          )}
          <span>{formatTime(booking.start_time)}–{formatTime(booking.end_time)}</span>
        </div>

        {showResource && (
          <div className="booking-resource">
            {booking.resource_name}
            {booking.resource_type && (
              <span className={`badge badge-${booking.resource_type}`} style={{ marginLeft: '6px' }}>
                {t(`booking.${booking.resource_type}`)}
              </span>
            )}
          </div>
        )}

        <div className="booking-user">
          <User size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
          {booking.user_name}
        </div>

        {booking.purpose && (
          <div className="booking-purpose">
            <MessageSquare size={11} style={{ opacity: 0.5, flexShrink: 0, display: 'inline', marginRight: '3px' }} />
            {booking.purpose}
          </div>
        )}
      </div>

      {(canEdit || canDelete) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          {canEdit && onEdit && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onEdit(booking)}
              title={t('common.edit')}
            >
              <Edit2 size={15} />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onDelete(booking.id)}
              title={t('common.delete')}
            >
              <Trash2 size={15} style={{ color: 'var(--color-danger)' }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
