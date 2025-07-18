import { getNotifications, markAsRead } from '../services/notification.service.js';

document.addEventListener('DOMContentLoaded', () => {
    const notificationListPanel = document.getElementById('notification-list-panel');
    const notificationDetailPanel = document.getElementById('notification-detail-panel');
    const notificationsDot = document.getElementById('notifications-dot');

    const target = window.location.pathname.includes('hospital') ? 'hospital' : 'bloodbank';

    const renderNotifications = (notifications) => {
        notificationListPanel.innerHTML = '';
        let hasUnread = false;

        if (notifications.length === 0) {
            notificationListPanel.innerHTML = '<p>No notifications.</p>';
            updateUnreadIndicator(false);
            return;
        }

        notifications.forEach(notification => {
            const notificationElement = document.createElement('div');
            notificationElement.classList.add('notification-item');
            notificationElement.dataset.notificationId = notification.notificationId; // Store ID

            if (notification.isRead) {
                notificationElement.classList.add('read');
            } else {
                hasUnread = true;
                const unreadDot = document.createElement('span');
                unreadDot.classList.add('unread-dot');
                notificationElement.appendChild(unreadDot);
            }
            notificationElement.innerHTML += `<p class="message-preview">${notification.message}</p>`;
            notificationListPanel.appendChild(notificationElement);

            notificationElement.addEventListener('click', () => {
                renderNotificationDetail(notification);

                // If the clicked item was unread, trigger the "mark all as read" process.
                if (!notificationElement.classList.contains('read')) {
                    updateUnreadIndicator(false); // Hide the main dot immediately.

                    const unreadItems = notificationListPanel.querySelectorAll('.notification-item:not(.read)');
                    
                    unreadItems.forEach(item => {
                        const id = item.dataset.notificationId;
                        if (id) {
                            markAsRead(id); // Mark as read in the backend
                        }
                        item.classList.add('read');
                        const dot = item.querySelector('.unread-dot');
                        if (dot) {
                            dot.remove();
                        }
                    });
                }
            });
        });

        updateUnreadIndicator(hasUnread);
    };

    const renderNotificationDetail = (notification) => {
        notificationDetailPanel.innerHTML = `
            <div class="notification-detail-header">
                <h3>Notification</h3>
            </div>
            <div class="notification-detail-body">
                <p>${notification.message}</p>
                <span class="timestamp">${new Date(notification.timestamp.seconds * 1000).toLocaleString()}</span>
            </div>
        `;
    };

    const updateUnreadIndicator = (show) => {
        if (notificationsDot) {
            notificationsDot.classList.toggle('hidden', !show);
        }
    };

    getNotifications(target, renderNotifications);
});