/**
 * main.js
 * The main entry point for the blood bank portal application.
 * This file is now simplified to only initialize the UI and the main handler.
 */
import { auth } from '../../firebase-config.js';
import * as handler from './handler.js';
import * as ui from './ui.js';
import { getNotifications } from '../../services/notification.service.js';
import { checkAndExpireBloodBags } from '../../services/inventory.service.js';

document.addEventListener('DOMContentLoaded', () => {
    ui.init(); // Initialize UI elements immediately to avoid race conditions

    auth.onAuthStateChanged(user => {
        if (user) {
            // User is authenticated, proceed with app initialization
            console.log("User authenticated, initializing application.");

            // Run background tasks
            checkAndExpireBloodBags();

            // Initialize the main handler, which sets up event listeners and loads initial data
            handler.initialize();

            // Set up real-time notification listener
            getNotifications('bloodbank', (notifications) => {
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
