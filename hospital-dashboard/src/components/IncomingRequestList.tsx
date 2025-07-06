import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

interface Request {
    RequestID: number;
    PatientID: string;
    PatientBloodType: string;
    Urgency: 'Emergency' | 'Urgent' | 'Scheduled';
    Status: string;
    CreatedAt: string;
}

const IncomingRequestList = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchAllRequests = async () => {
        try {
            // Fetch all requests to show the full picture
            const response = await axios.get(`${API_URL}/requests`);
            setRequests(response.data);
        } catch (err) {
            setError('Failed to fetch incoming requests.');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAllRequests();
        const ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'new_update') {
                fetchAllRequests();
            }
        };
        return () => ws.close();
    }, []);

    if (error) return <div className="alert error">{error}</div>;

    return (
        <div className="dashboard-container">
            <h2>All Incoming Requests</h2>
            {requests.length === 0 ? (
                <p>No requests found.</p>
            ) : (
                <table className="requests-table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Patient ID</th>
                            <th>Blood Type</th>
                            <th>Urgency</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.RequestID}>
                                <td>{req.RequestID}</td>
                                <td>{req.PatientID}</td>
                                <td>{req.PatientBloodType}</td>
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default IncomingRequestList;