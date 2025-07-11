import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../App';
import './RequestStatusDashboard.css';

interface Request {
    RequestID: number;
    PatientName: string;
    PatientBloodType: string;
    Urgency: 'Emergency' | 'Urgent' | 'Scheduled';
    Status: string;
    CreatedAt: string;
    RequiredAt: string;
    SpecialRequirements: string | null;
    CrossmatchReport: string | null;
    Quantity: number;
}

const API_URL = 'http://localhost:3003';

const formatDate = (dateString: string) => {
    if (!dateString) return '_';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const RequestStatusDashboard = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { socket } = useContext(SocketContext);

    const fetchRequests = async () => {
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/requests`);
            setRequests(response.data);
            console.log('Fetched requests:', response.data);
        } catch (err) {
            setError('Failed to fetch requests. Is the backend server running?');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelRequest = async (requestId: number) => {
        try {
            await axios.put(`${API_URL}/requests/${requestId}/cancel`);
            fetchRequests(); // Refresh the list
        } catch (err) {
            setError('Failed to cancel request.');
            console.error(err);
        }
    };

    const handleDeliverRequest = async (requestId: number) => {
        if (window.confirm('Are you sure you want to mark this request as received?')) {
            try {
                await axios.post(`${API_URL}/requests/${requestId}/deliver`);
                fetchRequests(); // Refresh the list
            } catch (err) {
                setError('Failed to mark request as delivered.');
                console.error(err);
            }
        }
    };

    useEffect(() => {
        fetchRequests();

        if (socket) {
            socket.on('inventory_updated', fetchRequests);
        }

        return () => {
            if (socket) {
                socket.off('inventory_updated', fetchRequests);
            }
        };
    }, [socket]);

    if (isLoading) {
        return <div>Loading requests...</div>;
    }

    if (error) {
        return <div className="alert error">{error}</div>;
    }

    return (
        <div className="dashboard-container">
            <h2>Your Active Requests</h2>
            {requests.length === 0 ? (
                <p>No active requests found.</p>
            ) : (
                <table className="requests-table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Patient Name</th>
                            <th>Blood Type</th>
                            <th>Urgency</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Special Requirements</th>
                            <th>Crossmatch Report</th>
                            <th>Request Date</th>
                            <th>Required Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.RequestID}>
                                <td>{req.RequestID}</td>
                                <td>{req.PatientName}</td>
                                <td>{req.PatientBloodType}</td>
                                <td>
                                    <span className={`urgency-tag ${req.Urgency.toLowerCase()}`}>
                                        {req.Urgency}
                                    </span>
                                </td>
                                <td>{req.Quantity}</td>
                                <td>
                                    <span className={`status-tag status-${req.Status.toLowerCase()}`}>
                                        {req.Status.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td>
                                    {req.SpecialRequirements ? JSON.parse(req.SpecialRequirements).join(', ') : '_'}
                                </td>
                                <td>{req.CrossmatchReport || '_'}</td>
                                <td>{formatDate(req.CreatedAt)}</td>
                                <td>{formatDate(req.RequiredAt)}</td>
                                <td>
                                    {req.Status === 'PENDING_REVIEW' && (
                                        <button onClick={() => handleCancelRequest(req.RequestID)} className="cancel-btn">
                                            Cancel
                                        </button>
                                    )}
                                    {req.Status === 'ALLOCATED' && (
                                        <button onClick={() => handleDeliverRequest(req.RequestID)} className="deliver-btn">
                                            Mark as Received
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default RequestStatusDashboard;