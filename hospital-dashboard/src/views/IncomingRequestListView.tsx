import React from 'react';
import IncomingRequestList from '../components/IncomingRequestList';

const IncomingRequestListView = () => {
    return (
        <div>
            <h2>All Incoming Requests</h2>
            <IncomingRequestList viewMode='bloodBank' />
        </div>
    );
};

export default IncomingRequestListView;