import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import CrossmatchFileUpload from './CrossmatchFileUpload';

const API_URL = 'http://localhost:3003';

interface RequestDetailsData {
    RequestID: number;
    PatientName: string;
    PatientBloodType: string;
    Urgency: string;
    Status: string;
    Quantity: number;
    SpecialRequirements: string | null;
    RequiredAt: string;
    CreatedAt: string;
    CrossmatchReport: string | null;
    Notes: string | null;
}

const RequestDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<RequestDetailsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancellationError, setCancellationError] = useState<string | null>(null);

    const fetchRequestDetails = async () => {
        if (!id) return;
        try {
            const response = await axios.get(`${API_URL}/requests/${id}`);
            setRequest(response.data);
        } catch (err) {
            setError('Failed to fetch request details.');
            console.error(err);
        }
    };

    useEffect(() => {
        if (id) {
            fetchRequestDetails();
        }
    }, [id]);

    const handleCancelRequest = async () => {
        if (!id || !request) return;

        const nonCancellableStatuses = ['FULFILLED', 'CANCELLED_BY_HOSPITAL', 'REJECTED_BY_BLOODBANK'];
        if (nonCancellableStatuses.includes(request.Status)) {
            setCancellationError(`This request cannot be cancelled as its status is '${request.Status}'.`);
            return;
        }

        const confirmCancel = window.confirm("Are you sure you want to cancel this request? This action cannot be undone.");
        if (!confirmCancel) return;

        setIsCancelling(true);
        setCancellationError(null);
        try {
            await axios.post(`${API_URL}/requests/${id}/cancel`);
            await fetchRequestDetails(); // Refresh details to show the new status
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to cancel the request. Please try again.';
            setCancellationError(errorMessage);
            console.error(err);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleDeliverRequest = async () => {
        if (!id || !request) return;

        const confirmDeliver = window.confirm("Are you sure you want to mark this request as delivered?");
        if (!confirmDeliver) return;

        try {
            await axios.post(`${API_URL}/requests/${id}/deliver`);
            await fetchRequestDetails(); // Refresh details to show the new status
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to mark the request as delivered. Please try again.';
            setCancellationError(errorMessage);
            console.error(err);
        }
    };

    if (error) return <div className="alert error">{error}</div>;
    if (!request) return <div>Loading request details...</div>;

    const canBeCancelled = !['FULFILLED', 'CANCELLED_BY_HOSPITAL', 'REJECTED_BY_BLOODBANK'].includes(request.Status);

    return (
        <div className="details-container">
            <h2>Request Details - ID: {request.RequestID}</h2>
            <div className="details-grid">
                <p><strong>Patient Name:</strong> {request.PatientName}</p>
                <p><strong>Status:</strong> <span className={`status-badge status-${request.Status.toLowerCase()}`}>{request.Status.replace(/_/g, ' ')}</span></p>
                <p><strong>Blood Type:</strong> {request.PatientBloodType}</p>
                <p><strong>Urgency:</strong> {request.Urgency}</p>
                <p><strong>Quantity:</strong> {request.Quantity}</p>
                <p><strong>Special Requirements:</strong> {request.SpecialRequirements ? JSON.parse(request.SpecialRequirements).join(', ') : '_'}</p>
                <p><strong>Crossmatch Report:</strong> {request.CrossmatchReport ? <a href={`${API_URL}/reports/${request.CrossmatchReport}`} target="_blank" rel="noopener noreferrer">{request.CrossmatchReport}</a> : '_'}</p>
                <p><strong>Required At:</strong> {new Date(request.RequiredAt).toLocaleString()}</p>
                <p><strong>Created:</strong> {new Date(request.CreatedAt).toLocaleString()}</p>
                <p><strong>Notes:</strong> {request.Notes || '_'}</p>
            </div>

            {cancellationError && <div className="alert error" style={{ marginTop: '1rem' }}>{cancellationError}</div>}

            <div className="actions-section" style={{ marginTop: '1.5rem' }}>
                {request.Status === 'PENDING_CROSSMATCH' && id && (
                    <CrossmatchFileUpload requestId={id} onUploadSuccess={fetchRequestDetails} />
                )}

                {canBeCancelled && (
                    <button
                        onClick={handleCancelRequest}
                        disabled={isCancelling}
                        className="button danger"
                        style={{ marginLeft: request.Status === 'PENDING_CROSSMATCH' ? '1rem' : '0' }}
                    >
                        {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                )}

            </div>
        </div>
    );
};

export default RequestDetails;