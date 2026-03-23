import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Booking } from '../types';

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByDate = useCallback(async (date: string) => {
    try {
      setLoading(true);
      const data = await api.get<Booking[]>(`/bookings/date/${date}`);
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByResourceAndDate = useCallback(async (resourceId: string, date: string) => {
    try {
      setLoading(true);
      const data = await api.get<Booking[]>(`/bookings/resource/${resourceId}/date/${date}`);
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMine = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Booking[]>('/bookings/mine');
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBooking = useCallback(async (data: {
    resource_id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    purpose: string;
    for_user_id?: string;
  }) => {
    const result = await api.post<Booking>('/bookings', data);
    return result;
  }, []);

  const deleteBooking = useCallback(async (id: string) => {
    await api.delete(`/bookings/${id}`);
  }, []);

  const updateBooking = useCallback(async (id: string, data: {
    booking_date?: string;
    start_time?: string;
    end_time?: string;
    purpose?: string;
  }) => {
    const result = await api.put<Booking>(`/bookings/${id}`, data);
    return result;
  }, []);

  const fetchByUser = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const data = await api.get<Booking[]>(`/bookings/user/${userId}`);
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAllUserBookings = useCallback(async (userId: string) => {
    await api.delete(`/bookings/user/${userId}`);
  }, []);

  return {
    bookings,
    loading,
    error,
    fetchByDate,
    fetchByResourceAndDate,
    fetchMine,
    fetchByUser,
    createBooking,
    updateBooking,
    deleteBooking,
    deleteAllUserBookings,
  };
}
