import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

interface RequestDetailsData {
    RequestID: number;
    PatientID: string;
    PatientBloodType: string;
    Urgency: string;
    Status: string;
    CreatedAt: string;
    Notes: string | null;
    // We would also fetch and display items here in a real app
}

const RequestDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<RequestDetailsData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRequestDetails = async () => {
            try {
                // This endpoint doesn't exist yet, we'll need to add it
                const response = await axios.get(`${API_URL}/requests/${id}`);
                setRequest(response.data);
            } catch (err) {
                setError('Failed to fetch request details.');
                console.error(err);
            }
        };

        if (id) {
            fetchRequestDetails();
        }
    }, [id]);

    if (error) return <div className="alert error">{error}</div>;
    if (!request) return <div>Loading request details...</div>;

    return (
        <div className="details-container">
            <h2>Request Details - ID: {request.RequestID}</h2>
            <div className="details-grid">
                <p><strong>Patient ID:</strong> {request.PatientID}</p>
                <p><strong>Status:</strong> {request.Status}</p>
                <p><strong>Blood Type:</strong> {request.PatientBloodType}</p>
                <p><strong>Urgency:</strong> {request.Urgency}</p>
                <p><strong>Created:</strong> {new Date(request.CreatedAt).toLocaleString()}</p>
                <p><strong>Notes:</strong> {request.Notes || 'N/A'}</p>
            </div>
        </div>
    );
};

export default RequestDetails;