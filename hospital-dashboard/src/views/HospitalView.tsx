// This component defines the routes for the Hospital Staff view.
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SubmitRequestForm from '../components/SubmitRequestForm.tsx';
import RequestStatusDashboard from '../components/RequestStatusDashboard.tsx';
import RequestDetails from '../components/RequestDetails.tsx'; // Import the new component

const HospitalView = () => {
  return (
    <Routes>
      <Route path="/" element={<SubmitRequestForm />} />
      <Route path="/requests" element={<RequestStatusDashboard />} />
      <Route path="/requests/:id" element={<RequestDetails />} /> {/* Add the new route */}
    </Routes>
  );
};

export default HospitalView;