import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CrossmatchManagement from 'components/CrossmatchManagement';

const API_URL = 'http://localhost:3003';
const WS_URL = 'ws://localhost:3003';

interface Request {
    RequestID: number;
    PatientID: number;
    PatientName: string;
    PatientBloodType: string;
    Urgency: 'Emergency' | 'Urgent' | 'Scheduled';
    Status: string;
    Quantity: number;
    SpecialRequirements: string | null;
    RequiredAt: string;
}

interface IncomingRequestListProps {
    viewMode: 'hospital' | 'bloodBank';
}

const IncomingRequestList: React.FC<IncomingRequestListProps> = ({ viewMode }) => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [managingRequestId, setManagingRequestId] = useState<number | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Request; direction: string } | null>(null);

    const fetchAllRequests = async () => {
        try {
            const response = await axios.get<Request[]>(`${API_URL}/requests`);
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

    const handleCancelRequest = async (requestId: number) => {
        if (window.confirm('Are you sure you want to cancel this request?')) {
            try {
                await axios.post(`${API_URL}/requests/${requestId}/cancel`);
                fetchAllRequests(); // Refresh the list
            } catch (err) {
                alert('Failed to cancel the request.');
                console.error(err);
            }
        }
    };

    const handleDispatch = async (requestId: number) => {
        if (window.confirm('Are you sure you want to mark this request as dispatched?')) {
            try {
                await axios.post(`${API_URL}/requests/${requestId}/dispatch`);
                fetchAllRequests(); // Refresh the list
            } catch (err) {
                alert('Failed to dispatch the request.');
                console.error(err);
            }
        }
    };

    const cancellableStatuses = ['PENDING_CROSSMATCH', 'ESCALATED_TO_DONORS'];

    const sortedRequests = React.useMemo(() => {
        let sortableItems = [...requests];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === null) return -1;
                if (bValue === null) return 1;
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [requests, sortConfig]);

    const requestSort = (key: keyof Request) => {
        let direction = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (error) return <div className="alert error">{error}</div>;

    return (
        <div className="dashboard-container">
            {managingRequestId ? (
                <CrossmatchManagement
                    requestId={managingRequestId}
                    onClose={() => {
                        setManagingRequestId(null);
                        fetchAllRequests();
                    }}
                />
            ) : (
                <>
                    <h2>All Incoming Requests</h2>
                    {requests.length === 0 ? (
                        <p>No requests found.</p>
                    ) : (
                        <table className="requests-table">
                            <thead>
                                <tr>
                                    <th onClick={() => requestSort('RequestID')}>Request ID</th>
                                    <th onClick={() => requestSort('PatientName')}>Patient Name</th>
                                    <th onClick={() => requestSort('PatientBloodType')}>Blood Type</th>
                                    <th onClick={() => requestSort('Urgency')}>Urgency</th>
                                    <th onClick={() => requestSort('Quantity')}>Quantity</th>
                                    <th onClick={() => requestSort('Status')}>Status</th>
                                    <th onClick={() => requestSort('SpecialRequirements')}>Special Requirements</th>
                                    <th onClick={() => requestSort('RequiredAt')}>Required Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRequests.map((req) => (
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
                                        <td>{new Date(req.RequiredAt).toLocaleString()}</td>
                                        <td>
                                            {viewMode === 'hospital' && cancellableStatuses.includes(req.Status) && (
                                                <button
                                                    className="button button-cancel"
                                                    onClick={() => handleCancelRequest(req.RequestID)}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {viewMode === 'bloodBank' && req.Status === 'PENDING_CROSSMATCH' && (
                                                <button
                                                    className="button button-manage"
                                                    onClick={() => setManagingRequestId(req.RequestID)}
                                                >
                                                    Manage Crossmatch
                                                </button>
                                            )}
                                            {viewMode === 'bloodBank' && req.Status === 'ALLOCATED' && (
                                                <button
                                                    className="button button-dispatch"
                                                    onClick={() => handleDispatch(req.RequestID)}
                                                >
                                                    Dispatch
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </div>
    );
};

export default IncomingRequestList;