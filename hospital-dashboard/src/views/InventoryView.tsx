import React from 'react';
import InventoryManagement from '../components/InventoryManagement';
import InventoryStats from '../components/InventoryStats';

const InventoryView = () => {
    return (
        <div>
            <h2>Manage Inventory</h2>
            <InventoryStats />
            <InventoryManagement />
        </div>
    );
};

export default InventoryView;