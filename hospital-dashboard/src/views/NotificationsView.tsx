import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3003';

interface Notification {
    NotificationID: number;
    Message: string;
    IsRead: boolean;
    CreatedAt: string;
}

const NotificationsView: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await axios.get<Notification[]>(`${API_URL}/notifications`);
                setNotifications(response.data);
            } catch (err) {
                setError('Failed to fetch notifications.');
                console.error(err);
            }
        };

        fetchNotifications();
    }, []);

    return (
        <div className="notifications-view">
            <h2>All Notifications</h2>
            {error && <div className="error-message">{error}</div>}
            {notifications.length === 0 ? (
                <p>No notifications found.</p>
            ) : (
                <ul className="notifications-list">
                    {notifications.map(n => (
                        <li key={n.NotificationID} className={n.IsRead ? 'read' : 'unread'}>
                            <p>{n.Message}</p>
                            <span>{new Date(n.CreatedAt).toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default NotificationsView;