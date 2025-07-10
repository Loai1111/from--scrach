import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import './SubmitRequestForm.css';

const API_URL = 'http://localhost:3003';


const specialRequirementsOptions = [
    'CMV-Negative',
    'Irradiated',
    'Leukoreduced',
    'HbS-Negative'
];

interface PatientOption {
    value: number;
    label: string;
    bloodType: string;
}

const SubmitRequestForm = () => {
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
    const [urgency, setUrgency] = useState('Scheduled');
    const [quantity, setQuantity] = useState(1);
    const [requiredDateTime, setRequiredDateTime] = useState(() => {
        const now = new Date();
        now.setHours(now.getHours() + 1); // Default to one hour from now
        // Format to 'YYYY-MM-DDTHH:mm' for the datetime-local input
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    });
    const [specialRequirements, setSpecialRequirements] = useState<string[]>([]);
    
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const response = await axios.get(`${API_URL}/patients`);
                const patientOptions = response.data.map((p: any) => ({
                    value: p.PatientID,
                    label: `${p.PatientName} (${p.BloodType})`,
                    bloodType: p.BloodType
                }));
                setPatients(patientOptions);
            } catch (err) {
                setError('Failed to fetch patient list.');
                console.error(err);
            }
        };
        fetchPatients();
    }, []);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;
        if (checked) {
            setSpecialRequirements(prev => [...prev, value]);
        } else {
            setSpecialRequirements(prev => prev.filter(req => req !== value));
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const year = new Date(e.target.value).getFullYear();
        if (year.toString().length > 4) {
            setError('The year cannot have more than 4 digits.');
            return;
        }
        setError(null);
        setRequiredDateTime(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!selectedPatient || !requiredDateTime || quantity < 1 || quantity > 10) {
            setError('All fields are required. Please select a patient, a valid date/time, and a quantity between 1 and 10.');
            return;
        }

        const localDate = new Date(requiredDateTime);

        if (localDate < new Date()) {
            setError('The required date and time cannot be in the past.');
            return;
        }

        const year = localDate.getFullYear();
        if (year > new Date().getFullYear() + 5) {
            setError('The year cannot be more than 5 years in the future.');
            return;
        }

        const requestData = {
            hospitalId: 1,
            staffId: 101,
            patientId: selectedPatient.value,
            urgency,
            requiredDateTime: localDate.toISOString(),
            quantity,
            specialRequirements,
            bloodType: selectedPatient.bloodType
        };

        try {
            const response = await axios.post(`${API_URL}/requests`, requestData);
            setSuccess(`Request submitted successfully! Request ID: ${response.data.requestId}`);
            // Reset form
            setSelectedPatient(null);
            setUrgency('Scheduled');
            setQuantity(1);
            setSpecialRequirements([]);
            setRequiredDateTime(() => {
                const now = new Date();
                now.setHours(now.getHours() + 1); // Default to one hour from now
                // Format to 'YYYY-MM-DDTHH:mm' for the datetime-local input
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            });
        } catch (err) {
            setError('Failed to submit request. Please check the backend server.');
            console.error(err);
        }
    };

    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    return (
        <div className="form-container">
            <h2>Submit New Blood Request</h2>
            <form onSubmit={handleSubmit} className="request-form">
                {error && <div className="alert error">{error}</div>}
                {success && <div className="alert success">{success}</div>}

                <div className="form-group">
                    <label>Select Patient</label>
                    <Select
                        options={patients}
                        value={selectedPatient}
                        onChange={setSelectedPatient}
                        placeholder="Search by name or ID..."
                        isClearable
                        classNamePrefix="react-select"
                    />
                </div>

                <div className="form-group">
                    <label>Urgency</label>
                    <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Emergency">Emergency</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Required Date and Time</label>
                    <input
                        type="datetime-local"
                        value={requiredDateTime}
                        onChange={handleDateChange}
                        min={getMinDateTime()}
                        required
                    />
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
                            max="10"
                        />
                        <small>Maximum quantity per request is 10 units.</small>
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