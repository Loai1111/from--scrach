import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import IncomingRequestListView from './IncomingRequestListView';
import InventoryView from './InventoryView';
import ExpiredBagsView from './ExpiredBagsView';
import './BloodBankView.css';

const BloodBankView = () => {
    return (
        <div>
            <div className="blood-bank-content">
                <Routes>
                    <Route index element={<IncomingRequestListView />} />
                    <Route path="requests" element={<IncomingRequestListView />} />
                    <Route path="inventory" element={<InventoryView />} />
                    <Route path="expired" element={<ExpiredBagsView />} />
                </Routes>
            </div>
        </div>
    );
};

export default BloodBankView;