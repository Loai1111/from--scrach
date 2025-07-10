import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3003';
const WS_URL = 'ws://localhost:3003';

interface InventoryStatsData {
    totalBags: number;
    byBloodType: { [key: string]: number };
}

const InventoryStats = () => {
    const [stats, setStats] = useState<InventoryStatsData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchInventoryStats = async () => {
        try {
            const response = await axios.get<InventoryStatsData>(`${API_URL}/inventory/stats`);
            setStats(response.data);
        } catch (err) {
            setError('Failed to fetch inventory stats.');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchInventoryStats();
        const ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'new_update') {
                fetchInventoryStats();
            }
        };
        return () => ws.close();
    }, []);

    if (error) return <div className="alert error">{error}</div>;
    if (!stats) return <div>Loading stats...</div>;

    return (
        <div className="inventory-stats">
            <h3>Inventory Statistics</h3>
            <p><strong>Total Bags:</strong> {stats.totalBags}</p>
            <h4>Bags by Blood Type:</h4>
            <ul>
                {Object.entries(stats.byBloodType).map(([bloodType, count]) => (
                    <li key={bloodType}>{bloodType}: {count}</li>
                ))}
            </ul>
        </div>
    );
};

export default InventoryStats;