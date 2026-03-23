import type { Booking } from '../../types';
import { useTranslation } from '../../i18n';

interface BookingTimelineProps {
  bookings: Booking[];
  onSlotClick?: (hour: number, minute: number) => void;
  onBookingClick?: (booking: Booking) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const QUARTERS = [0, 15, 30, 45];
const HOURS_PER_ROW = 6;

function formatSlotTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function bookingAtSlot(bookings: Booking[], hour: number, minute: number): Booking | null {
  const slotStart = hour * 60 + minute;
  const slotEnd = slotStart + 15;
  for (const b of bookings) {
    const [sh, sm] = b.start_time.split(':').map(Number);
    const [eh, em] = b.end_time.split(':').map(Number);
    if (slotStart < eh * 60 + em && slotEnd > sh * 60 + sm) return b;
  }
  return null;
}

export function BookingTimeline({ bookings, onSlotClick, onBookingClick }: BookingTimelineProps) {
  const { t } = useTranslation();

  const rows: number[][] = [];
  for (let i = 0; i < 24; i += HOURS_PER_ROW) rows.push(HOURS.slice(i, i + HOURS_PER_ROW));

  return (
    <div className="timeline-grid">
      {rows.map((rowHours, rowIdx) => (
        <div key={rowIdx} className="timeline-row">
          {rowHours.map(hour => (
            <div key={hour} className="timeline-hour-block">
              <div className="timeline-hour-label">{String(hour).padStart(2, '0')}h</div>
              <div className="timeline-quarters">
                {QUARTERS.map(minute => {
                  const booking = bookingAtSlot(bookings, hour, minute);
                  const slotLabel = formatSlotTime(hour, minute);
                  return (
                    <div
                      key={minute}
                      className={`timeline-quarter${booking ? ' occupied' : ' available'}`}
                      title={booking
                        ? `${booking.start_time.slice(0, 5)}–${booking.end_time.slice(0, 5)} · ${booking.user_name}${booking.purpose ? ` · ${booking.purpose}` : ''}`
                        : `${slotLabel} — ${t('booking.available')}`}
                      onClick={() => {
                        if (booking) {
                          onBookingClick?.(booking);
                        } else {
                          onSlotClick?.(hour, minute);
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
