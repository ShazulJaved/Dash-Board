// components/SidebarNotification.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SidebarNotification() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    // Load announcements and calculate unread count
    const savedAnnouncements = localStorage.getItem('user_announcements');
    const savedReadAnnouncements = localStorage.getItem('read_announcements');

    if (savedAnnouncements) {
      const announcements = JSON.parse(savedAnnouncements);
      const recent = announcements.slice(0, 3); // Show 3 most recent
      setRecentAnnouncements(recent);

      if (savedReadAnnouncements) {
        const readIds = new Set(JSON.parse(savedReadAnnouncements));
        const unread = announcements.filter((a: any) => !readIds.has(a.id)).length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(announcements.length);
      }
    }

    // Show popup if there are unread announcements
    if (unreadCount > 0) {
      const timeout = setTimeout(() => {
        setShowPopup(true);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [unreadCount]);

  const handleMarkAllAsRead = () => {
    const savedAnnouncements = localStorage.getItem('user_announcements');
    if (savedAnnouncements) {
      const announcements = JSON.parse(savedAnnouncements);
      const allIds = announcements.map((a: any) => a.id);
      localStorage.setItem('read_announcements', JSON.stringify(allIds));
      setUnreadCount(0);
      setShowPopup(false);
    }
  };

  return (
    <>
      {/* Notification Bell in Sidebar */}
      <div className="relative">
        <Bell className="w-6 h-6 text-gray-600 hover:text-blue-600 cursor-pointer transition-colors" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse"
          >
            {unreadCount}
          </motion.span>
        )}
      </div>

      {/* Popup Notification */}
      <AnimatePresence>
        {showPopup && unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-w-sm w-full"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">New Announcements</h3>
                </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {recentAnnouncements.slice(0, 3).map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <p className="font-medium text-sm text-gray-900">
                      {announcement.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark all as read</span>
                </button>
                <a
                  href="/announcements"
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  View All
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}