import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { todayStr, getMonday } from '../../utils/dates';
import { formatHoliday, type Holiday } from '../../utils/holidays';

interface MonthCalendarProps {
  selectedDate: string;
  currentWeekStart: string;
  onSelectDay: (date: string, weekStart: string) => void;
  holidays?: Record<string, Holiday[]>;
}

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getMonthStart(yearMonth: string): Date {
  return new Date(yearMonth + '-01T00:00:00');
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Returns Monday-indexed day of week (0=Mon, 6=Sun)
function mondayDow(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function MonthCalendar({
  selectedDate,
  currentWeekStart,
  onSelectDay,
  holidays = {},
}: MonthCalendarProps) {
  const [viewYM, setViewYM] = useState<string>(() => selectedDate.slice(0, 7));

  const today = todayStr();
  const [year, month] = viewYM.split('-').map(Number);
  const monthStart = getMonthStart(viewYM);
  const daysInMonth = getDaysInMonth(year, month - 1);
  const firstDow = mondayDow(monthStart); // offset before first day

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setViewYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setViewYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // Build grid: 7 columns, fill leading blanks then days then trailing blanks
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const dateStr = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const handleDayClick = (day: number) => {
    const ds = dateStr(day);
    const weekStart = getMonday(ds);
    onSelectDay(ds, weekStart);
  };

  const isInCurrentWeek = (day: number) => {
    const ds = dateStr(day);
    return ds >= currentWeekStart && ds <= addDays(currentWeekStart, 6);
  };

  return (
    <div className="month-calendar">
      <div className="month-calendar-header">
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span className="month-calendar-title">
          {monthNames[month - 1]} {year}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="month-calendar-grid">
        {DAY_HEADERS.map(d => (
          <div key={d} className="month-cal-header">{d}</div>
        ))}

        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (day === null) {
              return <div key={`${wi}-${di}`} className="month-cal-day empty" />;
            }
            const ds = dateStr(day);
            const isToday = ds === today;
            const inWeek = isInCurrentWeek(day);
            const dayHolidays = holidays[ds] ?? [];
            const hasHoliday = dayHolidays.length > 0;
            const isPast = ds < today;
            const holidayTitle = dayHolidays.map(formatHoliday).join(', ');

            return (
              <div
                key={`${wi}-${di}`}
                className={[
                  'month-cal-day',
                  isToday ? 'today' : '',
                  inWeek ? 'in-week' : '',
                  isPast ? 'past' : '',
                  hasHoliday ? 'holiday' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleDayClick(day)}
                title={hasHoliday ? holidayTitle : undefined}
              >
                <span className="month-cal-day-num">{day}</span>
                {hasHoliday && <span className="holiday-dot" title={holidayTitle} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
