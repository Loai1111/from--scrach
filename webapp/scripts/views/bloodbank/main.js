/**
 * main.js
 * The main entry point for the blood bank portal application.
 * This file is now simplified to only initialize the UI and the main handler.
 */

import * as handler from './handler.js';
import * as ui from './ui.js';
import { getNotifications } from '../../services/notification.service.js';
import { checkAndExpireBloodBags } from '../../services/inventory.service.js';

document.addEventListener('DOMContentLoaded', () => {
    // Run the expiration check as soon as the app loads to ensure inventory is up-to-date.
    checkAndExpireBloodBags();
    
    // 1. Initialize UI module to bind all DOM element references
    ui.init();

    // 2. Initialize the main handler, which sets up all event listeners and loads initial data
    handler.initialize();
    // 3. Check for unread notifications
    getNotifications('bloodbank', (notifications) => {
        const hasUnread = notifications.some(n => !n.isRead);
        const notificationsDot = document.getElementById('notifications-dot');
        if (notificationsDot) {
            notificationsDot.classList.toggle('hidden', !hasUnread);
        }
    });
});
