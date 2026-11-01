import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Bell, Check, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReviewById?: (id: number) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  onSelectReviewById,
}) => {
  const { notifications, markNotificationRead } = useAuth();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-950/20 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden mt-12 text-xs flex flex-col max-h-[500px]">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-900 dark:text-white">Notifications</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-2 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No notifications yet.</div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markNotificationRead(n.id);
                  if (n.link && onSelectReviewById) {
                    const reviewId = parseInt(n.link.split('/').pop() || '', 10);
                    if (!isNaN(reviewId)) onSelectReviewById(reviewId);
                    onClose();
                  }
                }}
                className={`p-3 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                  n.isRead ? 'opacity-70 hover:opacity-100' : 'bg-indigo-50/50 dark:bg-indigo-950/20 font-medium'
                }`}
              >
                {getIcon(n.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    {n.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
