import React, { useState, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';

// Import views for each role
import HospitalView from './views/HospitalView.tsx';
import BloodBankView from './views/BloodBankView.tsx';

// Define a type for our user roles
export type UserRole = 'hospital' | 'blood_bank';

// Create a context to provide the current role to all components
export const AppContext = createContext<{ role: UserRole }>({ role: 'hospital' });

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('hospital');

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentRole(event.target.value as UserRole);
  };

  return (
    <AppContext.Provider value={{ role: currentRole }}>
      <Router>
        <div className="App">
          <header className="App-header">
            <div className="header-content">
              <h1>Lifeline Dashboard</h1>
              <div className="role-switcher">
                <label htmlFor="role-select">Current Role:</label>
                <select id="role-select" value={currentRole} onChange={handleRoleChange}>
                  <option value="hospital">Hospital Staff</option>
                  <option value="blood_bank">Blood Bank Staff</option>
                </select>
              </div>
            </div>
            <nav className="App-nav">
              {currentRole === 'hospital' && (
                <>
                  <NavLink to="/">Submit Request</NavLink>
                  <NavLink to="/requests">View My Requests</NavLink>
                </>
              )}
              {currentRole === 'blood_bank' && (
                <>
                  <NavLink to="/">Incoming Requests</NavLink>
                  <NavLink to="/inventory">Manage Inventory</NavLink>
                </>
              )}
            </nav>
          </header>
          <main className="container">
            <Routes>
              <Route path="/*" element={currentRole === 'hospital' ? <HospitalView /> : <BloodBankView />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;