export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date | string;
  updatedAt: Date | string;
  authorId: string;
  authorName: string;
  isActive: boolean;
}

export interface AnnouncementsResponse {
  announcements: Announcement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}