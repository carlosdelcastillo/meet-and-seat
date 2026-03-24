import { useState, useEffect } from 'react';
import { fetchHolidaysForYear, type Holiday } from '../utils/holidays';

/**
 * Fetches and caches public holidays for Spain for the given year-months.
 * Returns a flat array of all holidays across the requested years.
 */
export function useHolidays(yearMonths: string[]): Holiday[] {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const yearsKey = [...new Set(yearMonths.map(ym => ym.slice(0, 4)))]
    .sort((a, b) => a.localeCompare(b))
    .join(',');

  useEffect(() => {
    if (!yearsKey) return;
    const years = yearsKey.split(',').map(Number);
    Promise.all(years.map(fetchHolidaysForYear)).then(results => {
      const flat = results.flat();
      setHolidays(flat);
    });
  }, [yearsKey]);

  return holidays;
}
