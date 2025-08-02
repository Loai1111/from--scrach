/**
 * main.js (hospital)
 * The main entry point for the hospital portal application.
 */

import { auth } from '../../firebase-config.js';
import * as handler from './handler.js';
import * as ui from './ui.js';
import { getNotifications } from '../../services/notification.service.js';

document.addEventListener('DOMContentLoaded', () => {
    ui.init(); // Initialize UI elements immediately

    auth.onAuthStateChanged(user => {
        if (user) {
            // User is authenticated, proceed with app initialization
            console.log("User authenticated, initializing hospital application.");
            
            // Initialize the main handler
            handler.initialize();

            // Set up real-time notification listener
            getNotifications('hospital', (notifications) => {
                const hasUnread = notifications.some(n => !n.isRead);
                const notificationsDot = document.getElementById('notifications-dot');
                if (notificationsDot) {
                    notificationsDot.classList.toggle('hidden', !hasUnread);
                }
            });
        } else {
            // No user is authenticated, redirect to login page
            console.log("No user authenticated, redirecting to login.");
            window.location.href = './login.html';
        }
    });
});
