// This component defines the routes for the Hospital Staff view.
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SubmitRequestForm from 'components/SubmitRequestForm';
import RequestStatusDashboard from 'components/RequestStatusDashboard';
import RequestDetails from 'components/RequestDetails';
import IncomingRequestList from 'components/IncomingRequestList';

const HospitalView = () => {
  return (
    <Routes>
      <Route path="/" element={<SubmitRequestForm />} />
      <Route path="/requests" element={<RequestStatusDashboard />} />
      <Route path="/requests/:id" element={<RequestDetails />} />
      <Route path="/incoming-requests" element={<IncomingRequestList viewMode='hospital' />} />
    </Routes>
  );
};

export default HospitalView;