import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../App';

const API_URL = 'http://localhost:3003';

interface ExpiredBag {
    BagID: number;
    DonorName: string;
    BloodType: string;
    ExpiryDate: string;
    Disposed: boolean;
}

const ExpiredBags = () => {
    const [expiredBags, setExpiredBags] = useState<ExpiredBag[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { socket } = useContext(SocketContext);
    const [sortConfig, setSortConfig] = useState<{ key: keyof ExpiredBag; direction: string } | null>(null);

    const fetchExpiredBags = async () => {
        try {
            const response = await axios.get(`${API_URL}/inventory/expired`);
            setExpiredBags(response.data);
        } catch (err) {
            setError('Failed to fetch expired bags.');
            console.error(err);
        }
    };

    const handleDispose = async (bagId: number) => {
        try {
            await axios.put(`${API_URL}/bags/${bagId}/dispose`);
            fetchExpiredBags(); // Refresh the list
        } catch (err) {
            setError('Failed to mark bag as disposed.');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchExpiredBags();

        if (socket) {
            socket.on('inventory_updated', fetchExpiredBags);
        }

        return () => {
            if (socket) {
                socket.off('inventory_updated', fetchExpiredBags);
            }
        };
    }, [socket]);

    const sortedExpiredBags = React.useMemo(() => {
        let sortableItems = [...expiredBags];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [expiredBags, sortConfig]);

    const requestSort = (key: keyof ExpiredBag) => {
        let direction = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (error) return <div className="alert error">{error}</div>;

    return (
        <div className="expired-bags-container">
            <h2>Expired Blood Bags</h2>
            {expiredBags.length === 0 ? (
                <p>No expired bags found.</p>
            ) : (
                <table className="requests-table">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('BagID')}>Bag ID</th>
                            <th onClick={() => requestSort('DonorName')}>Donor Name</th>
                            <th onClick={() => requestSort('BloodType')}>Blood Type</th>
                            <th onClick={() => requestSort('ExpiryDate')}>Expiry Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedExpiredBags.map((bag) => (
                            <tr key={bag.BagID}>
                                <td>{bag.BagID}</td>
                                <td>{bag.DonorName || '_'}</td>
                                <td>{bag.BloodType}</td>
                                <td>{new Date(bag.ExpiryDate).toLocaleString()}</td>
                                <td>
                                    {!bag.Disposed ? (
                                        <button onClick={() => handleDispose(bag.BagID)}>
                                            Mark as Disposed
                                        </button>
                                    ) : (
                                        'Disposed'
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

export default ExpiredBags;