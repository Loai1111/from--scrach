import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Select from 'react-select';
import UpdateBagForm from './UpdateBagForm';
import { SocketContext } from '../App';

const API_URL = 'http://localhost:3003';

interface BloodBag {
    BagID: number;
    DonorID: number;
    DonorName: string;
    BloodType: string;
    CollectionDate: string;
    ExpiryDate: string;
}

interface Donor {
    DonorID: number;
    DonorName: string;
    BloodType: string;
}


const InventoryManagement = () => {
    const [inventory, setInventory] = useState<BloodBag[]>([]);
    const [donors, setDonors] = useState<Donor[]>([]);
    const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [expiryDate, setExpiryDate] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [updatingBag, setUpdatingBag] = useState<BloodBag | null>(null);
    const { socket } = useContext(SocketContext);

    const fetchInventory = async () => {
        try {
            const response = await axios.get(`${API_URL}/inventory`);
            setInventory(response.data);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch inventory.');
        }
    };

    const fetchDonors = async () => {
        try {
            const response = await axios.get(`${API_URL}/donors`);
            setDonors(response.data);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch donors.');
        }
    };

    useEffect(() => {
        fetchInventory();
        fetchDonors();

        if (socket) {
            socket.on('inventory_updated', () => {
                fetchInventory();
                fetchDonors();
            });
        }

        return () => {
            if (socket) {
                socket.off('inventory_updated');
            }
        };
    }, [socket]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const year = new Date(e.target.value).getFullYear();
        if (year.toString().length > 4) {
            setError('The year cannot have more than 4 digits.');
            return;
        }
        setError(null);
        setExpiryDate(e.target.value);
    };

    const handleAddBag = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!selectedDonor || !expiryDate || quantity < 1) {
            setError('A donor, expiry date, and valid quantity are required.');
            return;
        }

        const year = new Date(expiryDate).getFullYear();
        if (year > new Date().getFullYear() + 5) {
            setError('The year cannot be more than 5 years in the future.');
            return;
        }
        try {
            const { DonorID } = selectedDonor;
            await axios.post(`${API_URL}/inventory`, {
                donorId: DonorID,
                expiryDate,
                quantity
            });
            setSuccess(`${quantity} blood bag(s) added successfully.`);
            // Reset form
            setSelectedDonor(null);
            setExpiryDate('');
            setQuantity(1);
        } catch (err) {
            setError('Failed to add blood bag(s).');
            console.error(err);
        }
    };

    const handleDeleteBag = async (bagId: number) => {
        if (window.confirm('Are you sure you want to delete this blood bag?')) {
            try {
                await axios.delete(`${API_URL}/bags/${bagId}`);
                fetchInventory(); // Refresh the list
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || 'Failed to delete blood bag.';
                setError(errorMessage);
                console.error(err);
            }
        }
    };

    const handleUpdateClick = (bag: BloodBag) => {
        setUpdatingBag(bag);
    };

    const handleCloseUpdateForm = () => {
        setUpdatingBag(null);
        fetchInventory(); // Refresh the list
    };

    return (
        <div className="blood-bank-container">
            {updatingBag && (
                <UpdateBagForm
                    bagId={updatingBag.BagID}
                    donorId={updatingBag.DonorID}
                    bloodType={updatingBag.BloodType}
                    expiryDate={updatingBag.ExpiryDate}
                    onClose={handleCloseUpdateForm}
                />
            )}
            <div className="form-container">
                <h2>Add New Blood Bag</h2>
                <form onSubmit={handleAddBag} className="request-form">
                    {error && <div className="alert error">{error}</div>}
                    {success && <div className="alert success">{success}</div>}
                    <div className="form-group">
                        <label>Select Donor</label>
                        <Select
                            options={donors}
                            value={selectedDonor}
                            onChange={(option) => setSelectedDonor(option)}
                            getOptionValue={option => option.DonorID.toString()}
                            getOptionLabel={option => `${option.DonorName} (${option.BloodType})`}
                            isClearable
                            isSearchable
                            placeholder="-- Select a Donor --"
                        />
                    </div>
                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                            type="datetime-local"
                            value={expiryDate}
                            onChange={handleDateChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Quantity</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                            min="1"
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
                            <th>Donor Name</th>
                            <th>Blood Type</th>
                            <th>Collection Date</th>
                            <th>Expiry Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map((bag) => (
                            <tr key={bag.BagID}>
                                <td>{bag.BagID}</td>
                                <td>{bag.DonorName || '_'}</td>
                                <td>{bag.BloodType || 'N/A'}</td>
                                <td>{new Date(bag.CollectionDate).toLocaleDateString()}</td>
                                <td>{new Date(bag.ExpiryDate).toLocaleDateString()}</td>
                                <td>
                                    <button onClick={() => handleUpdateClick(bag)} className="update-btn">
                                        Update
                                    </button>
                                    <button onClick={() => handleDeleteBag(bag.BagID)} className="delete-btn">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryManagement;