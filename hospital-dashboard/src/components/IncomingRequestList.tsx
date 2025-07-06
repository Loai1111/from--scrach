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

    const fetchPendingRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}/requests?status=PENDING_REVIEW`);
            setRequests(response.data);
        } catch (err) {
            setError('Failed to fetch incoming requests.');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
        const ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'new_update') {
                fetchPendingRequests();
            }
        };
        return () => ws.close();
    }, []);

    const handleStatusUpdate = async (requestId: number, newStatus: string) => {
        try {
            await axios.put(`${API_URL}/requests/${requestId}/status`, { status: newStatus });
            // The WebSocket will trigger a re-fetch, so no need to manually update state
        } catch (err) {
            alert(`Failed to update status for request ${requestId}.`);
            console.error(err);
        }
    };

    if (error) return <div className="alert error">{error}</div>;

    return (
        <div className="dashboard-container">
            <h2>Incoming Requests (Pending Review)</h2>
            {requests.length === 0 ? (
                <p>No new requests requiring review.</p>
            ) : (
                <table className="requests-table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Patient ID</th>
                            <th>Blood Type</th>
                            <th>Urgency</th>
                            <th>Actions</th>
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
                                <td className="action-buttons">
                                    <button onClick={() => handleStatusUpdate(req.RequestID, 'ALLOCATED')} className="action-btn allocate">Allocate</button>
                                    <button onClick={() => handleStatusUpdate(req.RequestID, 'REJECTED_BY_BLOODBANK')} className="action-btn reject">Reject</button>
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