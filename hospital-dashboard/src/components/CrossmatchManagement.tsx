import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../App';

const API_URL = 'http://localhost:3003';

interface Recommendation {
    BagID: string;
    BloodType: string;
    ExpiryDate: string;
    opportunityCost: number;
}

interface CrossmatchManagementProps {
    requestId: number;
    onClose: () => void;
}

const CrossmatchManagement: React.FC<CrossmatchManagementProps> = ({ requestId, onClose }) => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [selectedBagIds, setSelectedBagIds] = useState<string[]>([]);
    const [isAllocated, setIsAllocated] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { socket } = useContext(SocketContext);

    const fetchRecommendations = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/requests/${requestId}/recommendations`);
            setRecommendations(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch recommendations.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();

        if (socket) {
            socket.on('inventory_updated', fetchRecommendations);
        }

        return () => {
            if (socket) {
                socket.off('inventory_updated', fetchRecommendations);
            }
        };
    }, [requestId, socket]);

    const handleSelectBag = (bagId: string) => {
        setSelectedBagIds(prev =>
            prev.includes(bagId) ? prev.filter(id => id !== bagId) : [...prev, bagId]
        );
    };

    const handleAllocate = async () => {
        if (selectedBagIds.length === 0) return;
        try {
            await axios.post(`${API_URL}/requests/${requestId}/allocate`, { bagIds: selectedBagIds });
            setIsAllocated(true);
            setError(null);
            alert('Bags successfully allocated!');
            onClose(); // Close the view after allocation
        } catch (err) {
            setError('Failed to allocate bags.');
            console.error(err);
        }
    };

    if (loading) return <div>Loading recommendations...</div>;
    if (error) return <div className="alert error">{error}</div>;

    return (
        <div className="crossmatch-management">
            <h3>Manage Crossmatch for Request #{requestId}</h3>
            <button onClick={onClose} className="button button-close">Close</button>

            <table>
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Bag ID</th>
                        <th>Blood Type</th>
                        <th>Expiry Date</th>
                        <th>Status</th>
                        <th>Opportunity Cost</th>
                    </tr>
                </thead>
                <tbody>
                    {recommendations.map((rec) => (
                        <tr key={rec.BagID} className={selectedBagIds.includes(rec.BagID) ? 'selected' : ''}>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={selectedBagIds.includes(rec.BagID)}
                                    onChange={() => handleSelectBag(rec.BagID)}
                                />
                            </td>
                            <td>{rec.BagID}</td>
                            <td>{rec.BloodType}</td>
                            <td>{new Date(rec.ExpiryDate).toLocaleDateString()}</td>
                            <td>{new Date(rec.ExpiryDate) < new Date() ? 'Expired' : 'Available'}</td>
                            <td>{rec.opportunityCost.toFixed(4)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="allocation-footer">
                <p>Selected Bags: {selectedBagIds.length}</p>
                <button
                    onClick={handleAllocate}
                    className="button button-primary"
                    disabled={selectedBagIds.length === 0 || isAllocated}
                >
                    {isAllocated ? 'Allocated' : 'Allocate Selected Bags'}
                </button>
            </div>
        </div>
    );
};

export default CrossmatchManagement;