export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  regions: string[]; // human-readable names; empty = nationwide
}

const SUBDIVISION_MAP: Record<string, string> = {
  'ES-AN': 'Andalucía',
  'ES-AR': 'Aragón',
  'ES-AS': 'Asturias',
  'ES-IB': 'Baleares',
  'ES-CN': 'Canarias',
  'ES-CB': 'Cantabria',
  'ES-CM': 'Castilla-La Mancha',
  'ES-CL': 'Castilla y León',
  'ES-CT': 'Cataluña',
  'ES-EX': 'Extremadura',
  'ES-GA': 'Galicia',
  'ES-RI': 'La Rioja',
  'ES-MD': 'Madrid',
  'ES-MC': 'Murcia',
  'ES-NC': 'Navarra',
  'ES-PV': 'País Vasco',
  'ES-VC': 'Valencia',
  'ES-CE': 'Ceuta',
  'ES-ML': 'Melilla',
};

interface ApiHoliday {
  startDate: string;
  name: { language: string; text: string }[];
  nationwide: boolean;
  subdivisions: { code: string }[];
}

const yearCache = new Map<number, Holiday[]>();
const pendingRequests = new Map<number, Promise<Holiday[]>>();

export async function fetchHolidaysForYear(year: number): Promise<Holiday[]> {
  if (yearCache.has(year)) return yearCache.get(year)!;
  if (pendingRequests.has(year)) return pendingRequests.get(year)!;

  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=ES&languageIsoCode=ES&validFrom=${from}&validTo=${to}`;

  const promise = fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<ApiHoliday[]>;
    })
    .then(data => {
      const holidays: Holiday[] = data.map(item => {
        const name =
          item.name.find(n => n.language === 'ES')?.text ??
          item.name[0]?.text ??
          '';
        if (item.nationwide) {
          return { date: item.startDate, name, regions: [] };
        }
        const regions = item.subdivisions
          .map(s => SUBDIVISION_MAP[s.code])
          .filter(Boolean);
        return { date: item.startDate, name, regions };
      });
      yearCache.set(year, holidays);
      pendingRequests.delete(year);
      return holidays;
    })
    .catch(() => {
      pendingRequests.delete(year);
      yearCache.set(year, []);
      return [] as Holiday[];
    });

  pendingRequests.set(year, promise);
  return promise;
}

/** Returns holidays for a month (YYYY-MM) indexed by date */
export function getHolidaysForMonth(
  yearMonth: string,
  holidays: Holiday[]
): Record<string, Holiday[]> {
  const result: Record<string, Holiday[]> = {};
  holidays
    .filter(h => h.date.startsWith(yearMonth))
    .forEach(h => {
      if (!result[h.date]) result[h.date] = [];
      result[h.date].push(h);
    });
  return result;
}

export function isHoliday(date: string, holidays: Holiday[]): boolean {
  return holidays.some(h => h.date === date);
}

/** Formats a holiday for display: "Navidad" or "Día de San José · Valencia, Aragón" */
export function formatHoliday(h: Holiday): string {
  if (h.regions.length === 0) return h.name;
  return `${h.name} · ${h.regions.join(', ')}`;
}
