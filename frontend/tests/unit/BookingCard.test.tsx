import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BookingCard } from '../../src/components/booking/BookingCard';
import { I18nContext } from '../../src/i18n';
import type { Booking } from '../../src/types';

const mockT = (key: string) => key;

const mockBooking: Booking = {
  id: 'booking-1',
  resource_id: 'res-1',
  user_id: 'user-1',
  booking_date: '2026-03-25',
  start_time: '09:00:00',
  end_time: '11:00:00',
  purpose: 'Team meeting',
  user_name: 'John Doe',
  user_email: 'john@example.com',
  resource_name: 'Room A',
  resource_type: 'room',
};

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: mockT }}>
      {ui}
    </I18nContext.Provider>
  );
}

describe('BookingCard', () => {
  it('renders booking info', () => {
    renderWithI18n(<BookingCard booking={mockBooking} />);
    expect(screen.getByText('Room A')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Team meeting')).toBeInTheDocument();
  });

  it('does not show delete button by default', () => {
    renderWithI18n(<BookingCard booking={mockBooking} />);
    expect(screen.queryByTitle('common.delete')).toBeNull();
  });

  it('shows delete button when canDelete=true', () => {
    const onDelete = vi.fn();
    renderWithI18n(<BookingCard booking={mockBooking} canDelete onDelete={onDelete} />);
    expect(screen.getByTitle('common.delete')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    renderWithI18n(<BookingCard booking={mockBooking} canDelete onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('common.delete'));
    expect(onDelete).toHaveBeenCalledWith('booking-1');
  });

  it('does not show edit button by default', () => {
    renderWithI18n(<BookingCard booking={mockBooking} />);
    expect(screen.queryByTitle('common.edit')).toBeNull();
  });

  it('shows edit button when canEdit=true', () => {
    const onEdit = vi.fn();
    renderWithI18n(<BookingCard booking={mockBooking} canEdit onEdit={onEdit} />);
    expect(screen.getByTitle('common.edit')).toBeInTheDocument();
  });

  it('calls onEdit with booking when edit clicked', () => {
    const onEdit = vi.fn();
    renderWithI18n(<BookingCard booking={mockBooking} canEdit onEdit={onEdit} />);
    fireEvent.click(screen.getByTitle('common.edit'));
    expect(onEdit).toHaveBeenCalledWith(mockBooking);
  });

  it('shows both edit and delete buttons when both enabled', () => {
    renderWithI18n(
      <BookingCard
        booking={mockBooking}
        canEdit
        canDelete
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTitle('common.edit')).toBeInTheDocument();
    expect(screen.getByTitle('common.delete')).toBeInTheDocument();
  });
});
