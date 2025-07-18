/**
 * main.js (hospital)
 * The main entry point for the hospital portal application.
 */

import * as handler from './handler.js';
import * as ui from './ui.js';
import { getNotifications } from '../../services/notification.service.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI module to bind all DOM element references
    ui.init();

    // 2. Initialize the main handler, which sets up all event listeners and loads initial data
    handler.initialize();
    // 3. Check for unread notifications
    getNotifications('hospital', (notifications) => {
        const hasUnread = notifications.some(n => !n.isRead);
        const notificationsDot = document.getElementById('notifications-dot');
        if (notificationsDot) {
            notificationsDot.classList.toggle('hidden', !hasUnread);
        }
    });
});
