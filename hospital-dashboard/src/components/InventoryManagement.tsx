import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

interface BloodBag {
    BagID: number;
    BloodType: string;
    CollectionDate: string;
    ExpiryDate: string;
}

const InventoryManagement = () => {
    const [inventory, setInventory] = useState<BloodBag[]>([]);
    const [bloodType, setBloodType] = useState('A+');
    const [expiryDate, setExpiryDate] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchInventory = async () => {
        try {
            const response = await axios.get(`${API_URL}/inventory`);
            setInventory(response.data);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch inventory.');
        }
    };

    useEffect(() => {
        fetchInventory();
        const ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'new_update') {
                fetchInventory();
            }
        };
        return () => ws.close();
    }, []);

    const handleAddBag = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!expiryDate) {
            setError('Expiry date is required.');
            return;
        }
        try {
            await axios.post(`${API_URL}/inventory`, { bloodType, expiryDate });
            setSuccess('Blood bag added successfully.');
            setExpiryDate('');
        } catch (err) {
            setError('Failed to add blood bag.');
            console.error(err);
        }
    };

    return (
        <div className="blood-bank-container">
            <div className="form-container">
                <h2>Add New Blood Bag</h2>
                <form onSubmit={handleAddBag} className="request-form">
                    {error && <div className="alert error">{error}</div>}
                    {success && <div className="alert success">{success}</div>}
                    <div className="form-group">
                        <label>Blood Type</label>
                        <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="submit-btn">Add to Inventory</button>
                </form>
            </div>
            <div className="inventory-list">
                <h2>Current Inventory</h2>
                <table className="requests-table">
                    <thead>
                        <tr>
                            <th>Bag ID</th>
                            <th>Blood Type</th>
                            <th>Collection Date</th>
                            <th>Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map((bag) => (
                            <tr key={bag.BagID}>
                                <td>{bag.BagID}</td>
                                <td>{bag.BloodType}</td>
                                <td>{new Date(bag.CollectionDate).toLocaleDateString()}</td>
                                <td>{new Date(bag.ExpiryDate).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryManagement;