import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import './NotificationBell.css';
import { SocketContext } from '../App';

const API_URL = 'http://localhost:3003';

interface Notification {
    NotificationID: number;
    Message: string;
    IsRead: boolean;
    CreatedAt: string;
    BagID?: number;
}

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { socket } = useContext(SocketContext);

    const sortNotifications = (notifs: Notification[]) => {
        return notifs.sort((a, b) => {
            if (a.IsRead && !b.IsRead) return 1;
            if (!a.IsRead && b.IsRead) return -1;
            return new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime();
        });
    };

    const fetchNotifications = async () => {
        try {
            const response = await axios.get<Notification[]>(`${API_URL}/notifications`);
            setNotifications(sortNotifications(response.data));
        } catch (err) {
            setError('Failed to fetch notifications.');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        if (socket) {
            socket.on('new_notification', fetchNotifications);
        }

        return () => {
            if (socket) {
                socket.off('new_notification', fetchNotifications);
            }
        };
    }, [socket]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleMarkAsRead = async (notification: Notification) => {
        const originalNotifications = [...notifications];
        const updatedNotifications = notifications.map(n =>
            n.NotificationID === notification.NotificationID ? { ...n, IsRead: true } : n
        );
        setNotifications(sortNotifications(updatedNotifications));

        try {
            await axios.put(`${API_URL}/notifications/${notification.NotificationID}`, { isRead: true });
            if (notification.Message.includes('expired')) {
                const bagIdMatch = notification.Message.match(/ID (\d+)/);
                if (bagIdMatch) {
                    const bagId = parseInt(bagIdMatch[1], 10);
                    await axios.put(`${API_URL}/bags/${bagId}/dispose`);
                }
            }
        } catch (err) {
            setError('Failed to mark notification as read. Please try again.');
            setNotifications(originalNotifications);
            console.error(err);
        }
    };

    const handleUnconfirm = async (notificationId: number) => {
        const originalNotifications = [...notifications];
        const updatedNotifications = notifications.map(n =>
            n.NotificationID === notificationId ? { ...n, IsRead: false } : n
        );
        setNotifications(sortNotifications(updatedNotifications));

        try {
            await axios.put(`${API_URL}/notifications/${notificationId}`, { isRead: false });
        } catch (err) {
            setError('Failed to unconfirm notification. Please try again.');
            setNotifications(originalNotifications);
            console.error(err);
        }
    };


    const unreadCount = notifications.filter(n => !n.IsRead).length;

    return (
        <div className="notification-bell" ref={dropdownRef}>
            <button onClick={handleToggle} className="bell-icon">
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
            {isOpen && (
                <div className="notifications-dropdown">
                    {error && <div className="error-message">{error}</div>}
                    <div className="notifications-header">
                        <h3>Notifications</h3>
                    </div>
                    {notifications.length === 0 ? (
                        <div className="no-notifications">No new notifications.</div>
                    ) : (
                        <ul className="notifications-list">
                            {notifications.map(n => (
                                <li
                                    key={n.NotificationID}
                                    className={n.IsRead ? 'read' : 'unread'}
                                    onClick={() => !n.IsRead && setConfirmingId(n.NotificationID)}
                                >
                                    <p>{n.Message}</p>
                                    <span>{new Date(n.CreatedAt).toLocaleString()}</span>
                                    {n.IsRead && <span className="disposed-label">Disposed</span>}
                                    {confirmingId === n.NotificationID && !n.IsRead && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkAsRead(n);
                                                setConfirmingId(null);
                                            }}
                                            className="confirm-disposal-button"
                                        >
                                            Confirm Disposal
                                        </button>
                                    )}
                                    {n.IsRead && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnconfirm(n.NotificationID);
                                            }}
                                            className="unconfirm-button"
                                        >
                                            Unconfirm
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;