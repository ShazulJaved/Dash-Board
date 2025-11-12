// hooks/useAnnouncements.ts
import { useState, useEffect } from 'react';
import { Announcement, AnnouncementsResponse } from '@/types/announcement';

export const useAnnouncements = (limit: number = 10) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
  });

  const fetchAnnouncements = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/announcements?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }
      
      const data: AnnouncementsResponse = await response.json();
      setAnnouncements(data.announcements);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const loadMore = () => {
    if (pagination.page < pagination.totalPages) {
      fetchAnnouncements(pagination.page + 1);
    }
  };

  const refresh = () => {
    fetchAnnouncements(1);
  };

  return {
    announcements,
    loading,
    error,
    pagination,
    fetchAnnouncements,
    loadMore,
    refresh,
  };
};