import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { useBookings } from '../../hooks/useBookings';
import { useResources } from '../../hooks/useResources';
import { BookingTimeline } from './BookingTimeline';
import { BookingCard } from './BookingCard';
import { MonthCalendar } from './MonthCalendar';
import { useTranslation } from '../../i18n';
import { todayStr, getMonday, getWeekDays, addDays } from '../../utils/dates';
import { getHolidaysForMonth, formatHoliday, type Holiday } from '../../utils/holidays';
import { useHolidays } from '../../hooks/useHolidays';
import type { Booking } from '../../types';

const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

interface BookingCalendarProps {
  onNewBooking: (resourceId: string, date: string, hour?: number, minute?: number) => void;
  refreshKey?: number;
}

export function BookingCalendar({ onNewBooking, refreshKey }: BookingCalendarProps) {
  const { t } = useTranslation();
  const { resources } = useResources();
  const { bookings, fetchByDate } = useBookings();

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [weekStart, setWeekStart] = useState(getMonday(todayStr()));
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [showMonthCal, setShowMonthCal] = useState(false);
  const [showHolidays, setShowHolidays] = useState(true);
  const monthCalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMonthCal) return;
    const handler = (e: MouseEvent) => {
      if (monthCalRef.current && !monthCalRef.current.contains(e.target as Node)) {
        setShowMonthCal(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMonthCal]);

  const weekDays = getWeekDays(weekStart);

  // Determine which year-months we need holidays for
  const viewYM = selectedDate.slice(0, 7);
  const lastDay = weekDays[weekDays.length - 1];
  const lastYM = lastDay.slice(0, 7);
  const yearMonths = lastYM !== viewYM ? [viewYM, lastYM] : [viewYM];
  const fetchedHolidays = useHolidays(yearMonths);
  const activeHolidays = showHolidays ? fetchedHolidays : [];

  const allHolidays: Record<string, Holiday[]> = {
    ...getHolidaysForMonth(viewYM, activeHolidays),
    ...(lastYM !== viewYM ? getHolidaysForMonth(lastYM, activeHolidays) : {}),
  };

  useEffect(() => {
    fetchByDate(selectedDate);
  }, [selectedDate, fetchByDate, refreshKey]);

  const filteredResources = resources.filter(r => {
    if (typeFilter !== 'all' && r.resource_type !== typeFilter) return false;
    if (nameFilter && !normalize(r.name).includes(normalize(nameFilter))) return false;
    return true;
  });

  const getBookingsForResource = useCallback((resourceId: string): Booking[] =>
    bookings.filter(b => b.resource_id === resourceId),
    [bookings]
  );

  const prevWeek = () => {
    const newStart = addDays(weekStart, -7);
    setWeekStart(newStart);
    setSelectedDate(newStart);
  };

  const nextWeek = () => {
    const newStart = addDays(weekStart, 7);
    setWeekStart(newStart);
    setSelectedDate(newStart);
  };

  const goToToday = () => {
    const today = todayStr();
    setWeekStart(getMonday(today));
    setSelectedDate(today);
  };

  const handleDaySelect = (date: string, ws: string) => {
    setWeekStart(ws);
    setSelectedDate(date);
    setShowMonthCal(false);
  };

  const selectedDayHolidays = allHolidays[selectedDate] ?? [];
  const weekLabel = (() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const fDate = new Date(first + 'T00:00:00');
    const lDate = new Date(last + 'T00:00:00');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (fDate.getMonth() === lDate.getMonth()) {
      return `${months[fDate.getMonth()]} ${fDate.getFullYear()}`;
    }
    return `${months[fDate.getMonth()]}–${months[lDate.getMonth()]} ${lDate.getFullYear()}`;
  })();

  return (
    <div>
      {/* Top controls row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Type filter */}
        <select
          className="input"
          style={{ width: 'auto' }}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">{t('booking.allBookings')}</option>
          <option value="room">{t('booking.rooms')}</option>
          <option value="desk">{t('booking.desks')}</option>
        </select>

        {/* Name filter */}
        <input
          type="text"
          className="input"
          style={{ width: '200px' }}
          placeholder={t('booking.filterResourceName')}
          value={nameFilter}
          onChange={e => setNameFilter(e.target.value)}
        />

        {/* Holidays toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={showHolidays}
            onChange={e => setShowHolidays(e.target.checked)}
          />
          {t('booking.holidays')}
        </label>
      </div>

      {/* Calendar navigation */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
        {/* Week strip + month toggle */}
        <div style={{ flex: 1 }}>
          <div className="calendar-nav">
            <button className="btn btn-ghost btn-sm" onClick={prevWeek}><ChevronLeft size={18} /></button>

            {/* Month label + toggle — popover anchored here */}
            <div ref={monthCalRef} style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600, minWidth: '160px' }}
                onClick={() => setShowMonthCal(v => !v)}
              >
                <Calendar size={16} style={{ marginRight: '6px' }} />
                {weekLabel}
              </button>

              {showMonthCal && (
                <div className="month-cal-popover">
                  <MonthCalendar
                    selectedDate={selectedDate}
                    currentWeekStart={weekStart}
                    onSelectDay={handleDaySelect}
                    holidays={allHolidays}
                  />
                </div>
              )}
            </div>

            <button className="btn btn-ghost btn-sm" onClick={nextWeek}><ChevronRight size={18} /></button>
            <button className="btn btn-secondary btn-sm" onClick={goToToday}>{t('booking.today')}</button>
          </div>

          {/* Day selector strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {weekDays.map(day => {
              const dayHolidays = allHolidays[day] ?? [];
              const isToday = day === todayStr();
              const isSelected = day === selectedDate;
              const d = new Date(day + 'T00:00:00');
              const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={`week-day-btn${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}${dayHolidays.length > 0 ? ' has-holiday' : ''}`}
                  title={dayHolidays.map(formatHoliday).join(', ')}
                >
                  <span className="week-day-name">{dayNames[d.getDay()]}</span>
                  <span className="week-day-num">{d.getDate()}</span>
                  {dayHolidays.length > 0 && <span className="week-holiday-dot" />}
                </button>
              );
            })}
          </div>

          {/* Holiday banner for selected day */}
          {selectedDayHolidays.length > 0 && (
            <div className="holiday-banner">
              <MapPin size={13} />
              {selectedDayHolidays.map(formatHoliday).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Resource cards */}
      <div className="resource-grid">
        {filteredResources.map(resource => {
          const resourceBookings = getBookingsForResource(resource.id);
          const isSelected = selectedResource === resource.id;
          return (
            <div
              key={resource.id}
              className={`card resource-card${isSelected ? ' selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedResource(resource.id === selectedResource ? '' : resource.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedResource(resource.id === selectedResource ? '' : resource.id); }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ marginBottom: '4px' }}>{resource.name}</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`badge badge-${resource.resource_type}`}>
                      {t(`booking.${resource.resource_type}`)}
                    </span>
                    {resource.floor && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Planta {resource.floor}
                      </span>
                    )}
                    {resource.capacity > 1 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {resource.capacity} pers.
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={e => { e.stopPropagation(); onNewBooking(resource.id, selectedDate); }}
                  style={{ flexShrink: 0 }}
                >
                  + Reservar
                </button>
              </div>

              <div onClick={e => e.stopPropagation()} role="presentation">
                <BookingTimeline
                  bookings={resourceBookings}
                  onSlotClick={(hour, minute) => onNewBooking(resource.id, selectedDate, hour, minute)}
                  onBookingClick={() => setSelectedResource(resource.id)}
                />
              </div>

              {isSelected && resourceBookings.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {resourceBookings.map(b => (
                    <BookingCard key={b.id} booking={b} showResource={false} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="empty-state">
          <h3>{t('common.noResults')}</h3>
        </div>
      )}
    </div>
  );
}
