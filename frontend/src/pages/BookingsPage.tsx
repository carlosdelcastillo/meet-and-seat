import { useState } from 'react';
import { Plus } from 'lucide-react';
import { BookingCalendar } from '../components/booking/BookingCalendar';
import { BookingForm } from '../components/booking/BookingForm';
import { useBookings } from '../hooks/useBookings';
import { useResources } from '../hooks/useResources';
import { useTranslation } from '../i18n';
import { showToast } from '../components/ui/Toast';

export function BookingsPage() {
  const { t } = useTranslation();
  const { resources } = useResources();
  const { createBooking } = useBookings();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formDefaults, setFormDefaults] = useState<{
    resourceId?: string;
    date?: string;
    startTime?: string;
  }>({});

  const handleNewBooking = (resourceId: string, date: string, hour?: number, minute = 0) => {
    setFormDefaults({
      resourceId,
      date,
      startTime: hour !== undefined
        ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        : undefined,
    });
    setShowForm(true);
  };

  const handleSubmit = async (data: {
    resource_id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    purpose: string;
    for_user_id?: string;
  }) => {
    await createBooking(data);
    showToast(t('booking.created'));
    setRefreshKey(k => k + 1);
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('nav.bookings')}</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          {t('booking.new')}
        </button>
      </div>

      <BookingCalendar onNewBooking={handleNewBooking} refreshKey={refreshKey} />

      {showForm && (
        <BookingForm
          resources={resources}
          initialResourceId={formDefaults.resourceId}
          initialDate={formDefaults.date}
          initialStartTime={formDefaults.startTime}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
