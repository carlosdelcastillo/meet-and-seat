import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string; // HH:MM
  onChange: (value: string) => void;
  min?: string; // HH:MM — lower bound (inclusive + 15min gap enforced by parent)
}

const MINUTES = [0, 15, 30, 45];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function TimePicker({ value, onChange, min }: TimePickerProps) {
  const [h, m] = value.split(':').map(Number);

  const emit = (newH: number, newM: number) => {
    const next = `${pad(newH)}:${pad(newM)}`;
    if (min && next <= min) return;
    onChange(next);
  };

  const incHour = () => emit((h + 1) % 24, m);
  const decHour = () => emit((h - 1 + 24) % 24, m);

  const mIdx = MINUTES.indexOf(m) === -1 ? 0 : MINUTES.indexOf(m);
  const incMin = () => {
    const nextIdx = (mIdx + 1) % 4;
    emit(nextIdx === 0 ? (h + 1) % 24 : h, MINUTES[nextIdx]);
  };
  const decMin = () => {
    const prevIdx = (mIdx - 1 + 4) % 4;
    emit(prevIdx === 3 ? (h - 1 + 24) % 24 : h, MINUTES[prevIdx]);
  };

  return (
    <div className="time-picker">
      <div className="time-picker-col">
        <button type="button" className="time-picker-arrow" onClick={incHour} tabIndex={-1}>
          <ChevronUp size={18} />
        </button>
        <span className="time-picker-val">{pad(h)}</span>
        <button type="button" className="time-picker-arrow" onClick={decHour} tabIndex={-1}>
          <ChevronDown size={18} />
        </button>
      </div>

      <span className="time-picker-sep">:</span>

      <div className="time-picker-col">
        <button type="button" className="time-picker-arrow" onClick={incMin} tabIndex={-1}>
          <ChevronUp size={18} />
        </button>
        <span className="time-picker-val">{pad(m)}</span>
        <button type="button" className="time-picker-arrow" onClick={decMin} tabIndex={-1}>
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  );
}
