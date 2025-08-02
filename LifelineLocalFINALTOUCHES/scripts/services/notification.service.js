import { db } from '../firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const notificationsCollection = collection(db, 'notifications');

/**
 * Creates a new notification in Firestore.
 * @param {string} message - The notification message.
 * @param {string} target - The target audience ('hospital' or 'bloodbank').
 * @returns {Promise}
 */
export const createNotification = (message, target) => {
    return addDoc(notificationsCollection, {
        message: message,
        target: target,
        timestamp: serverTimestamp(),
        isRead: false
    });
};

/**
 * Fetches notifications for a specific target.
 * @param {string} target - The target audience ('hospital' or 'bloodbank').
 * @param {function} callback - The function to call with the notifications.
 */
export const getNotifications = async (target, callback) => {
    const q = query(notificationsCollection, where('target', '==', target), orderBy('timestamp', 'desc'));
    try {
        const querySnapshot = await getDocs(q);
        const notifications = [];
        querySnapshot.forEach((doc) => {
            notifications.push({ notificationId: doc.id, ...doc.data() });
        });
        if (callback) {
            callback(notifications);
        }
        return notifications;
    } catch (error) {
        console.error("Error fetching notifications: ", error);
        if (callback) {
            callback([]); // Send empty array on error
        }
        return []; // Return empty array for promise-based calls
    }
};

/**
 * Marks a notification as read.
 * @param {string} notificationId - The ID of the notification to mark as read.
 */
export const markAsRead = async (notificationId) => {
    const notificationRef = doc(db, 'notifications', notificationId);
    try {
        await updateDoc(notificationRef, {
            isRead: true
        });
    } catch (error) {
        console.error("Error marking notification as read: ", error);
    }
};