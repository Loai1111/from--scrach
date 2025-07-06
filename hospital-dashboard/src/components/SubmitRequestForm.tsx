// This component provides a form for hospital staff to submit new blood requests.
import React, { useState } from 'react';
import axios from 'axios';
import './SubmitRequestForm.css';

const API_URL = 'http://localhost:3001';

const specialRequirementsOptions = [
    'CMV-Negative',
    'Irradiated',
    'Leukoreduced',
    'HbS-Negative'
];

const SubmitRequestForm = () => {
    const [patientId, setPatientId] = useState('');
    const [patientBloodType, setPatientBloodType] = useState('A+');
    const [urgency, setUrgency] = useState('Scheduled');
    const [quantity, setQuantity] = useState(1);
    const [specialRequirements, setSpecialRequirements] = useState<string[]>([]);
    
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;
        if (checked) {
            setSpecialRequirements(prev => [...prev, value]);
        } else {
            setSpecialRequirements(prev => prev.filter(req => req !== value));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!patientId.trim() || quantity < 1) {
            setError('Patient ID and a valid quantity are required.');
            return;
        }

        const requestData = {
            hospitalId: 1, 
            staffId: 101,
            patientId,
            patientBloodType,
            urgency,
            items: [{ 
                componentType: 'Whole Blood', // Simplified as requested
                quantity, 
                specialRequirements 
            }]
        };

        try {
            const response = await axios.post(`${API_URL}/requests`, requestData);
            setSuccess(`Request submitted successfully! Request ID: ${response.data.requestId}`);
            // Reset form
            setPatientId('');
            setPatientBloodType('A+');
            setUrgency('Scheduled');
            setQuantity(1);
            setSpecialRequirements([]);
        } catch (err) {
            setError('Failed to submit request. Please check the backend server.');
            console.error(err);
        }
    };

    return (
        <div className="form-container">
            <h2>Submit New Blood Request</h2>
            <form onSubmit={handleSubmit} className="request-form">
                {error && <div className="alert error">{error}</div>}
                {success && <div className="alert success">{success}</div>}

                <div className="form-group">
                    <label>Patient ID</label>
                    <input
                        type="text"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        placeholder="e.g., HOS-12345"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Patient Blood Type</label>
                    <select value={patientBloodType} onChange={(e) => setPatientBloodType(e.target.value)}>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Urgency</label>
                    <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Emergency">Emergency</option>
                    </select>
                </div>

                <fieldset>
                    <legend>Request Details</legend>
                    <div className="form-group">
                        <label>Quantity (units)</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                            min="1"
                        />
                    </div>
                    <div className="form-group">
                        <label>Special Requirements</label>
                        <div className="checkbox-group">
                            {specialRequirementsOptions.map(req => (
                                <label key={req} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        value={req}
                                        checked={specialRequirements.includes(req)}
                                        onChange={handleCheckboxChange}
                                    />
                                    {req}
                                </label>
                            ))}
                        </div>
                    </div>
                </fieldset>

                <button type="submit" className="submit-btn">Submit Request</button>
            </form>
        </div>
    );
};

export default SubmitRequestForm;