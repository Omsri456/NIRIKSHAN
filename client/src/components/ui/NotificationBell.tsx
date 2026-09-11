import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '@nirikshan/shared';
import { fetchNotifications } from '@/api/notifications';
import { formatDateTime } from '@/utils/format';

const LS_KEY = 'nirikshan_read_notifications';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>): void {
  // Keep at most 200 entries to avoid localStorage bloat
  const arr = Array.from(ids).slice(-200);
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '⚠️',
  low: '🔵',
  info: 'ℹ️',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const loadNotifications = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch {
      // Graceful degradation — bell shows but no notifications
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  const handleToggle = useCallback(() => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && notifications.length === 0) {
      loadNotifications(true);
    }
  }, [isOpen, notifications.length, loadNotifications]);

  const handleMarkAllRead = useCallback(() => {
    const newReadIds = new Set(readIds);
    notifications.forEach(n => newReadIds.add(n.id));
    setReadIds(newReadIds);
    persistReadIds(newReadIds);
  }, [readIds, notifications]);

  const handleClickNotification = useCallback((notif: AppNotification) => {
    // Mark as read
    const newReadIds = new Set(readIds);
    newReadIds.add(notif.id);
    setReadIds(newReadIds);
    persistReadIds(newReadIds);
    // Navigate and close
    setIsOpen(false);
    if (notif.targetRoute) {
      navigate(notif.targetRoute);
    }
  }, [readIds, navigate]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Initial load and periodic 5-minute background refresh
  useEffect(() => {
    loadNotifications(false);
    const interval = setInterval(() => {
      loadNotifications(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return (
    <div className="notif-bell-wrap">
      <button
        ref={bellRef}
        type="button"
        className="notif-bell-btn"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div ref={dropdownRef} className="notif-dropdown">
          {/* Header */}
          <div className="notif-header">
            <span className="notif-header-title">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="notif-list">
            {isLoading && (
              <div className="notif-empty">
                <span className="notif-empty-icon">⏳</span>
                <span>Loading notifications…</span>
              </div>
            )}
            {!isLoading && notifications.length === 0 && (
              <div className="notif-empty">
                <span className="notif-empty-icon">✅</span>
                <span>No notifications</span>
                <span className="notif-empty-sub">All clear — no alerts for your jurisdiction.</span>
              </div>
            )}
            {!isLoading && notifications.map(notif => {
              const isRead = readIds.has(notif.id);
              return (
                <button
                  key={notif.id}
                  type="button"
                  className={`notif-item ${isRead ? '' : 'notif-item-unread'}`}
                  onClick={() => handleClickNotification(notif)}
                >
                  <span className={`notif-severity-dot notif-severity-${notif.severity}`} aria-hidden>
                    {SEVERITY_ICON[notif.severity] || '•'}
                  </span>
                  <div className="notif-item-body">
                    <div className="notif-item-title">{notif.title}</div>
                    <div className="notif-item-message">{notif.message}</div>
                    <div className="notif-item-time">{formatDateTime(notif.timestamp)}</div>
                  </div>
                  {!isRead && <span className="notif-unread-indicator" />}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notif-footer">
              <button
                type="button"
                className="notif-view-all-btn"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/early-warnings');
                }}
              >
                View all alerts →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
