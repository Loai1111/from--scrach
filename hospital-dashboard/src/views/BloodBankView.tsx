import React from 'react';
import { Routes, Route } from 'react-router-dom';
import IncomingRequestList from '../components/IncomingRequestList.tsx';
import InventoryManagement from '../components/InventoryManagement.tsx';

const BloodBankView = () => {
  return (
    <Routes>
      <Route path="/" element={<IncomingRequestList />} />
      <Route path="/inventory" element={<InventoryManagement />} />
    </Routes>
  );
};

export default BloodBankView;