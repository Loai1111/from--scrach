import React, { useState, createContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import './App.css';

// Import views for each role
import HospitalView from './views/HospitalView';
import BloodBankView from './views/BloodBankView';
import NotificationBell from './components/NotificationBell';

// Define a type for our user roles
export type UserRole = 'hospital' | 'bloodBank';

// Create a context to provide the current role to all components
export const AppContext = createContext<{ role: UserRole }>({ role: 'hospital' });

// Create a context for WebSocket updates
export const SocketContext = createContext<{ socket: Socket | null }>({ socket: null });

const SOCKET_URL = 'http://localhost:3003';

function App() {
    const [currentRole, setCurrentRole] = useState<UserRole>('hospital');
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });

        // Cleanup on component unmount
        return () => {
            newSocket.disconnect();
        };
    }, []);

    const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentRole(event.target.value as UserRole);
    };

    return (
        <AppContext.Provider value={{ role: currentRole }}>
            <SocketContext.Provider value={{ socket }}>
                <Router>
                    <div className="App">
                        <header className="App-header">
                            <div className="header-content">
                                <h1>Lifeline Dashboard</h1>
                                <div className="role-switcher">
                                    <label htmlFor="role-select">Current Role:</label>
                                    <select id="role-select" value={currentRole} onChange={handleRoleChange}>
                                        <option value="hospital">Hospital Staff</option>
                                        <option value="bloodBank">Blood Bank Staff</option>
                                    </select>
                                </div>
                               <NotificationBell role={currentRole} />
                            </div>
                            <nav className="App-nav">
                                {currentRole === 'hospital' && (
                                    <>
                                        <NavLink to="/">Submit Request</NavLink>
                                        <NavLink to="/requests">View My Requests</NavLink>
                                    </>
                                )}
                                {currentRole === 'bloodBank' && (
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
            </SocketContext.Provider>
        </AppContext.Provider>
    );
}

export default App;