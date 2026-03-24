import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Booking, MyBookingsParams, PaginatedResponse } from '../types';

export interface PaginatedMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginatedMeta, setPaginatedMeta] = useState<PaginatedMeta | null>(null);

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

  const fetchMine = useCallback(async (params: MyBookingsParams = {}) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (params.page != null) qs.set('page', String(params.page));
      if (params.per_page != null) qs.set('per_page', String(params.per_page));
      if (params.sort_by) qs.set('sort_by', params.sort_by);
      if (params.sort_dir) qs.set('sort_dir', params.sort_dir);
      if (params.date_from) qs.set('date_from', params.date_from);
      if (params.date_to) qs.set('date_to', params.date_to);
      if (params.resource_type) qs.set('resource_type', params.resource_type);
      if (params.resource_name) qs.set('resource_name', params.resource_name);
      const qstr = qs.toString();
      const url = qstr ? `/bookings/mine?${qstr}` : '/bookings/mine';
      const data = await api.get<PaginatedResponse<Booking>>(url);
      setBookings(data.items);
      setPaginatedMeta({
        total: data.total,
        page: data.page,
        per_page: data.per_page,
        total_pages: data.total_pages,
      });
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

  const fetchByUser = useCallback(async (userId: string, params: MyBookingsParams = {}) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (params.page != null) qs.set('page', String(params.page));
      if (params.per_page != null) qs.set('per_page', String(params.per_page));
      if (params.sort_by) qs.set('sort_by', params.sort_by);
      if (params.sort_dir) qs.set('sort_dir', params.sort_dir);
      if (params.date_from) qs.set('date_from', params.date_from);
      if (params.date_to) qs.set('date_to', params.date_to);
      if (params.resource_type) qs.set('resource_type', params.resource_type);
      if (params.resource_name) qs.set('resource_name', params.resource_name);
      const qstr = qs.toString();
      const url = qstr ? `/bookings/user/${userId}?${qstr}` : `/bookings/user/${userId}`;
      const data = await api.get<PaginatedResponse<Booking>>(url);
      setBookings(data.items);
      setPaginatedMeta({
        total: data.total,
        page: data.page,
        per_page: data.per_page,
        total_pages: data.total_pages,
      });
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
    paginatedMeta,
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
