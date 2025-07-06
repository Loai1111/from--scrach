const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const port = 3001;

app.use(cors());
app.use(express.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lifeline_db_1'
};

const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected');
    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

function broadcastUpdate() {
    const message = JSON.stringify({ type: 'new_update' });
    clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}

// --- Automated System Logic ---

async function processNewRequest(requestId, bloodType) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        // Check inventory for a matching blood bag
        const [bags] = await connection.execute('SELECT * FROM BloodBags WHERE BloodType = ? LIMIT 1', [bloodType]);
        
        let newStatus;
        if (bags.length > 0) {
            // Bag found, move to cross-matching
            newStatus = 'PENDING_CROSSMATCH';
        } else {
            // No bag found, escalate to find donors
            newStatus = 'ESCALATED_TO_DONORS';
        }

        // Update the request status
        await connection.execute('UPDATE BloodRequests SET Status = ? WHERE RequestID = ?', [newStatus, requestId]);
        console.log(`Request ${requestId} status automatically updated to ${newStatus}`);

    } catch (error) {
        console.error(`Failed to process request ${requestId}:`, error);
    } finally {
        await connection.end();
        // Notify clients of the change
        broadcastUpdate();
    }
}


// --- API Endpoints ---

// GET /requests (now includes item details)
app.get('/requests', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = `
            SELECT 
                r.RequestID, r.PatientID, r.PatientBloodType, r.Urgency, r.Status, r.CreatedAt,
                GROUP_CONCAT(i.ComponentType) as Components,
                i.SpecialRequirements
            FROM BloodRequests r
            JOIN BloodRequestItems i ON r.RequestID = i.RequestID
            GROUP BY r.RequestID
            ORDER BY r.CreatedAt DESC
        `;
        const [rows] = await connection.execute(query);
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET /requests/:id
app.get('/requests/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM BloodRequests WHERE RequestID = ?', [id]);
        await connection.end();
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Request not found.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// POST /requests
app.post('/requests', async (req, res) => {
    const { hospitalId, staffId, patientId, patientBloodType, urgency, items } = req.body;
    if (!hospitalId || !staffId || !patientId || !urgency || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Invalid request data.' });
    }
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();
        const requestQuery = 'INSERT INTO BloodRequests (HospitalID, StaffID, PatientID, PatientBloodType, Urgency) VALUES (?, ?, ?, ?, ?)';
        const [requestResult] = await connection.execute(requestQuery, [hospitalId, staffId, patientId, patientBloodType, urgency]);
        const newRequestId = requestResult.insertId;

        const itemQuery = 'INSERT INTO BloodRequestItems (RequestID, ComponentType, Quantity, SpecialRequirements) VALUES ?';
        const itemValues = items.map(item => [newRequestId, item.componentType, item.quantity, JSON.stringify(item.specialRequirements)]);
        await connection.query(itemQuery, [itemValues]);

        await connection.commit();
        await connection.end();
        
        res.status(201).json({ message: 'Request created successfully', requestId: newRequestId });
        
        // Trigger automated processing and notify clients
        broadcastUpdate(); 
        processNewRequest(newRequestId, patientBloodType);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET /inventory
app.get('/inventory', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM BloodBags ORDER BY ExpiryDate ASC');
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// POST /inventory
app.post('/inventory', async (req, res) => {
    const { bloodType, expiryDate } = req.body;
    if (!bloodType || !expiryDate) {
        return res.status(400).json({ message: 'Blood type and expiry date are required.' });
    }
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO BloodBags (BloodType, ExpiryDate) VALUES (?, ?)';
        await connection.execute(query, [bloodType, expiryDate]);
        await connection.end();
        res.status(201).json({ message: 'Blood bag added successfully.' });
        broadcastUpdate();
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

server.listen(port, () => {
    console.log(`Server with WebSocket listening at http://localhost:${port}`);
});