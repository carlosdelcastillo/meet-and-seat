import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingForm } from '../../src/components/booking/BookingForm';
import { I18nContext, translate } from '../../src/i18n';
import type { Resource } from '../../src/types';

const mockResources: Resource[] = [
  {
    id: '1',
    name: 'Room A',
    resource_type: 'room',
    description: '',
    capacity: 10,
    floor: '1',
    amenities: '',
    zone: '',
    equipment: '',
    is_active: true,
  },
];

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nContext.Provider value={{ locale: 'en', setLocale: () => {}, t: (key: string) => translate('en', key) }}>
      {ui}
    </I18nContext.Provider>
  );
}

describe('BookingForm', () => {
  it('renders all form fields', () => {
    renderWithI18n(
      <BookingForm
        resources={mockResources}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('New booking')).toBeTruthy();
    expect(screen.getByText('Resource')).toBeTruthy();
    expect(screen.getByText('Date')).toBeTruthy();
    expect(screen.getByText('Start time')).toBeTruthy();
    expect(screen.getByText('End time')).toBeTruthy();
    expect(screen.getByText('Purpose')).toBeTruthy();
  });

  it('shows resource options', () => {
    renderWithI18n(
      <BookingForm
        resources={mockResources}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Resource selector is a searchable text input with a custom dropdown
    const resourceInput = screen.getByPlaceholderText('Select a resource');
    expect(resourceInput).toBeTruthy();
    fireEvent.focus(resourceInput);
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(1); // 1 resource in the dropdown
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <BookingForm
        resources={mockResources}
        onSubmit={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
