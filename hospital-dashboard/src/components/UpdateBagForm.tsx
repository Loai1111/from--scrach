import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3003';

interface UpdateBagFormProps {
    bagId: number;
    donorId: number;
    bloodType: string;
    expiryDate: string;
    onClose: () => void;
}

const UpdateBagForm: React.FC<UpdateBagFormProps> = ({ bagId, donorId, bloodType, expiryDate, onClose }) => {
    const [newExpiryDate, setNewExpiryDate] = useState(expiryDate);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const year = new Date(e.target.value).getFullYear();
        if (year.toString().length > 4) {
            setError('The year cannot have more than 4 digits.');
            return;
        }
        setError(null);
        setNewExpiryDate(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await axios.put(`${API_URL}/bags/${bagId}`, { expiryDate: newExpiryDate });
            setSuccess('Blood bag updated successfully.');
            onClose();
        } catch (err) {
            setError('Failed to update blood bag.');
            console.error(err);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Update Blood Bag</h2>
                <form onSubmit={handleSubmit}>
                    {error && <div className="alert error">{error}</div>}
                    {success && <div className="alert success">{success}</div>}
                    <div className="form-group">
                        <label>Bag ID</label>
                        <input type="text" value={bagId} disabled />
                    </div>
                    <div className="form-group">
                        <label>Blood Type</label>
                        <input type="text" value={bloodType} disabled />
                    </div>
                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                            type="date"
                            value={newExpiryDate}
                            onChange={handleDateChange}
                            required
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="submit-btn">Update Bag</button>
                        <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateBagForm;