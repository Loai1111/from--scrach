import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RequestStatusDashboard.css';

interface Request {
    RequestID: number;
    PatientID: string;
    Urgency: 'Emergency' | 'Urgent' | 'Scheduled';
    Status: string;
    CreatedAt: string;
    SpecialRequirements: string | null; // Now a JSON string
}

const API_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

const RequestStatusDashboard = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRequests = async () => {
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/requests`);
            setRequests(response.data);
        } catch (err) {
            setError('Failed to fetch requests. Is the backend server running?');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'new_update') {
                fetchRequests();
            }
        };
        return () => ws.close();
    }, []);

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
                            <th>Patient ID</th>
                            <th>Urgency</th>
                            <th>Status</th>
                            <th>Special Requirements</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.RequestID}>
                                <td>{req.RequestID}</td>
                                <td>{req.PatientID}</td>
                                <td>
                                    <span className={`urgency-tag ${req.Urgency.toLowerCase()}`}>
                                        {req.Urgency}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-tag status-${req.Status.toLowerCase()}`}>
                                        {req.Status.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td>
                                    {req.SpecialRequirements && JSON.parse(req.SpecialRequirements).join(', ')}
                                </td>
                                <td>{new Date(req.CreatedAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default RequestStatusDashboard;