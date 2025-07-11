const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mysql = require('mysql2/promise');
const cors = require('cors');
const { getCompatibleBloodTypes, getRecipientCompatibilityCount } = require('./rules/bloodCompatibility');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // In a production environment, you should restrict this to your frontend's domain
        methods: ["GET", "POST"]
    }
});

const port = 3003; // Using a new port to avoid conflicts

app.use(cors());
app.use(express.json());
app.use('/reports', express.static(path.join(__dirname, 'reports')));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'reports/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
    }
});

const upload = multer({ storage: storage });

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lifeline_db_1',
    port: 3306
};

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

function broadcastUpdate() {
    io.emit('inventory_updated');
    console.log("Broadcasted 'inventory_updated' event to all clients.");
}
function broadcastNotificationUpdate() {
    io.emit('notification_updated');
    console.log("Broadcasted 'notification_updated' event to all clients.");
}

async function updateRequestStatus(requestId, newStatus) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [result] = await connection.execute(
            'UPDATE BloodRequests SET Status = ?, StatusUpdatedAt = NOW() WHERE RequestID = ?',
            [newStatus, requestId]
        );
        if (result.affectedRows > 0) {
            console.log(`Request ${requestId} status updated to ${newStatus}`);
            broadcastUpdate();
            return { success: true, message: `Request status updated to ${newStatus}` };
        } else {
            return { success: false, message: 'Request not found or status unchanged' };
        }
    } catch (error) {
        console.error(`Failed to update status for request ${requestId}:`, error);
        throw error;
    } finally {
        await connection.end();
    }
}

async function cancelRequest(requestId) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.beginTransaction();

        // Optional: Check current status to prevent cancelling a completed/processed request
        const [requests] = await connection.execute('SELECT Status FROM BloodRequests WHERE RequestID = ?', [requestId]);
        if (requests.length === 0) {
            await connection.rollback();
            return { success: false, message: 'Request not found.' };
        }
        const currentStatus = requests[0].Status;
        // Define statuses that cannot be cancelled from the hospital side
        const nonCancellableStatuses = ['FULFILLED', 'CANCELLED_BY_HOSPITAL', 'REJECTED_BY_BLOODBANK'];
        if (nonCancellableStatuses.includes(currentStatus)) {
            await connection.rollback();
            return { success: false, message: `Request cannot be cancelled because its status is '${currentStatus}'.` };
        }

        // 1. Update request status to 'CANCELLED_BY_HOSPITAL'
        await connection.execute(
            'UPDATE BloodRequests SET Status = ?, StatusUpdatedAt = NOW() WHERE RequestID = ?',
            ['CANCELLED_BY_HOSPITAL', requestId]
        );

        // 2. Find any bags reserved for this request and update their status back to 'Available'
        const [updateResult] = await connection.execute(
            `UPDATE BloodBags SET Status = 'Available', RequestID = NULL WHERE RequestID = ? AND Status = 'RESERVED'`,
            [requestId]
        );

        if (updateResult.affectedRows > 0) {
            console.log(`Released ${updateResult.affectedRows} reserved bag(s) for cancelled request ${requestId}.`);
        }

        await connection.commit();
        broadcastUpdate();
        return { success: true, message: 'Request cancelled successfully.' };

    } catch (error) {
        await connection.rollback();
        console.error(`Failed to cancel request ${requestId}:`, error);
        throw error;
    } finally {
        await connection.end();
    }
}

// --- Automated System Logic ---

async function updateExpiredBags() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        // Step 1: Find available bags that have just expired
        const [bagsToExpire] = await connection.execute(
            "SELECT BagID FROM BloodBags WHERE ExpiryDate < NOW() AND Status = 'Available'"
        );

        let inventoryUpdated = false;
        if (bagsToExpire.length > 0) {
            const bagIdsToExpire = bagsToExpire.map(bag => bag.BagID);
            const placeholders = bagIdsToExpire.map(() => '?').join(',');

            // Step 2: Update their status to 'Expired'
            const [updateResult] = await connection.execute(
                `UPDATE BloodBags SET Status = 'Expired' WHERE BagID IN (${placeholders})`,
                bagIdsToExpire
            );

            if (updateResult.affectedRows > 0) {
                console.log(`${updateResult.affectedRows} bag(s) marked as expired.`);
                inventoryUpdated = true;
            }
        }

        // Step 3: Find all expired bags that DON'T have a notification yet
        const [expiredBagsWithoutNotif] = await connection.execute(`
            SELECT b.BagID FROM BloodBags b
            LEFT JOIN notifications n ON b.BagID = n.ReferenceID AND n.NotificationType = 'BAG_EXPIRED'
            WHERE b.Status = 'Expired' AND n.NotificationID IS NULL
        `);

        let notificationsCreated = false;
        if (expiredBagsWithoutNotif.length > 0) {
            const bagIdsToNotify = expiredBagsWithoutNotif.map(bag => bag.BagID);
            
            const notificationValues = bagIdsToNotify.map(bagId =>
                ['BloodBank', `Bag ${bagId} has expired and requires disposal.`, 'BAG_EXPIRED', bagId]
            );

            const insertNotificationQuery = 'INSERT INTO notifications (RecipientRole, Message, NotificationType, ReferenceID) VALUES ?';
            await connection.query(insertNotificationQuery, [notificationValues]);
            
            console.log(`Created ${notificationValues.length} new notifications for expired bags.`);
            notificationsCreated = true;
        }

        await connection.commit();

        // Step 4: Broadcast updates if anything changed
        if (inventoryUpdated) {
            broadcastUpdate();
        }
        if (notificationsCreated) {
            broadcastNotificationUpdate();
        }

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Failed to update expired bags:', error);
    } finally {
        if (connection) await connection.end();
    }
}

// Run the check for expired bags every minute
setInterval(updateExpiredBags, 60000);

async function processNewRequest(requestId, patientBloodType, requestedQuantity) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const compatibleTypes = getCompatibleBloodTypes(patientBloodType);
        const placeholders = compatibleTypes.map(() => '?').join(',');
        const [bags] = await connection.execute(
            `SELECT COUNT(*) as TotalBags FROM BloodBags WHERE BloodType IN (${placeholders}) AND Status = 'Available'`,
            compatibleTypes
        );
        
        const availableQuantity = bags[0].TotalBags || 0;
        const newStatus = availableQuantity >= requestedQuantity ? 'PENDING_CROSSMATCH' : 'ESCALATED_TO_DONORS';
        
        await connection.execute('UPDATE BloodRequests SET Status = ?, StatusUpdatedAt = NOW() WHERE RequestID = ?', [newStatus, requestId]);
        console.log(`Request ${requestId} status automatically updated to ${newStatus}`);
    } catch (error) {
        console.error(`Failed to process request ${requestId}:`, error);
    } finally {
        await connection.end();
        broadcastUpdate();
    }
}

async function checkEscalatedRequests(newlyAddedBloodType) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [requests] = await connection.execute(`
            SELECT r.*
            FROM BloodRequests r
            WHERE r.Status = "ESCALATED_TO_DONORS"
            ORDER BY FIELD(r.Urgency, "Emergency", "Urgent", "Scheduled"), r.CreatedAt ASC
        `);

        for (const request of requests) {
            const compatibleTypes = getCompatibleBloodTypes(request.BloodType);
            if (compatibleTypes.includes(newlyAddedBloodType)) {
                const placeholders = compatibleTypes.map(() => '?').join(',');
                const [bags] = await connection.execute(
                    `SELECT COUNT(*) as TotalBags FROM BloodBags WHERE BloodType IN (${placeholders}) AND Status = 'Available'`,
                    compatibleTypes
                );
                const availableQuantity = bags[0].TotalBags || 0;

                if (availableQuantity >= request.Quantity) {
                    await connection.execute(
                        'UPDATE BloodRequests SET Status = "PENDING_CROSSMATCH", StatusUpdatedAt = NOW() WHERE RequestID = ?',
                        [request.RequestID]
                    );
                    console.log(`Escalated request ${request.RequestID} matched with new inventory. Status updated.`);
                    break;
                }
            }
        }
    } catch (error) {
        console.error(`Failed to check escalated requests for ${newlyAddedBloodType}:`, error);
    } finally {
        await connection.end();
        broadcastUpdate();
    }
}


// --- API Endpoints ---

app.get('/patients', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM Patients');
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/requests', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = `
            SELECT
                r.RequestID,
                r.PatientID,
                p.PatientName,
                p.BloodType AS PatientBloodType,
                r.Urgency,
                r.Status,
                r.Quantity,
                r.SpecialRequirements,
                r.RequiredAt,
                r.CreatedAt,
                r.CrossmatchReport
            FROM BloodRequests r
            JOIN Patients p ON r.PatientID = p.PatientID
            ORDER BY FIELD(r.Urgency, 'Emergency', 'Urgent', 'Scheduled'), r.CreatedAt DESC
        `;
        const [rows] = await connection.execute(query);
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/requests/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = `
            SELECT
                r.RequestID,
                r.PatientID,
                p.PatientName,
                p.BloodType AS PatientBloodType,
                r.Urgency,
                r.Status,
                r.Quantity,
                r.SpecialRequirements,
                r.RequiredAt,
                r.CreatedAt,
                r.CrossmatchReport
            FROM BloodRequests r
            JOIN Patients p ON r.PatientID = p.PatientID
            WHERE r.RequestID = ?
        `;
        const [rows] = await connection.execute(query, [id]);
        await connection.end();
        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Request not found' });
        }
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.post('/requests/:id/upload', upload.single('crossmatchReport'), async (req, res) => {
    const { id } = req.params;
    const { filename } = req.file;

    if (!filename) {
        return res.status(400).json({ message: 'File not provided.' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE BloodRequests SET CrossmatchReport = ? WHERE RequestID = ?', [filename, id]);
        await connection.end();
        broadcastUpdate();
        res.status(200).json({ message: 'File uploaded successfully.' });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.post('/requests', async (req, res) => {
    const { hospitalId, staffId, patientId, urgency, requiredDateTime, quantity, specialRequirements, bloodType } = req.body;
    if (!hospitalId || !staffId || !patientId || !urgency || !requiredDateTime || !quantity || !bloodType) {
        return res.status(400).json({ message: 'Invalid request data.' });
    }
    if (quantity > 10) {
        return res.status(400).json({ message: 'Quantity cannot exceed 10 units per request.' });
    }
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const insertRequestQuery = 'INSERT INTO BloodRequests (HospitalID, StaffID, PatientID, Urgency, Quantity, SpecialRequirements, CreatedAt, RequiredAt, BloodType) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)';
        const [requestResult] = await connection.execute(insertRequestQuery, [hospitalId, staffId, patientId, urgency, quantity, specialRequirements ? JSON.stringify(specialRequirements) : null, requiredDateTime, bloodType]);
        const newRequestId = requestResult.insertId;
        
        res.status(201).json({ message: 'Request created successfully', requestId: newRequestId });
        
        processNewRequest(newRequestId, bloodType, quantity);

    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- AI Recommendation Endpoint ---
app.get('/requests/:id/recommendations', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // 1. Fetch request and patient info
        const [requestRows] = await connection.execute(
            `SELECT BloodType FROM BloodRequests WHERE RequestID = ?`,
            [id]
        );

        if (requestRows.length === 0) {
            return res.status(404).json({ message: 'Request not found.' });
        }
        const patientBloodType = requestRows[0].BloodType;

        // 2. Fetch compatible, available blood bags
        const compatibleTypes = getCompatibleBloodTypes(patientBloodType);
        if (compatibleTypes.length === 0) {
            return res.status(200).json([]); // No compatible types found
        }
        const placeholders = compatibleTypes.map(() => '?').join(',');
        const [bags] = await connection.execute(
            `SELECT BagID, BloodType, ExpiryDate
             FROM BloodBags
             WHERE Status = 'Available' AND ExpiryDate >= NOW() AND BloodType IN (${placeholders})`,
            compatibleTypes
        );

        // 3. Score and sort the bags
        const scoredBags = bags.map(bag => {
            const expiryDate = new Date(bag.ExpiryDate);
            const now = new Date();
            const daysToExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);

            // Scoring: Lower is better.
            // FEFO Score: Closer to expiry = lower score. We use daysToExpiry directly.
            const fefoScore = daysToExpiry; 
            
            // Opportunity Cost Score: Fewer compatible recipients = lower score.
            const opportunityCost = getRecipientCompatibilityCount(bag.BloodType);

            return {
                ...bag,
                fefoScore,
                opportunityCost
            };
        });

        // Sort by opportunity cost first (ascending), then by FEFO score (ascending)
        scoredBags.sort((a, b) => {
            if (a.opportunityCost !== b.opportunityCost) {
                return a.opportunityCost - b.opportunityCost;
            }
            return a.fefoScore - b.fefoScore;
        });

        res.status(200).json(scoredBags);

    } catch (error) {
        console.error('Recommendation Engine Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- Status Update Endpoints ---

app.post('/requests/:id/allocate', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await updateRequestStatus(id, 'ALLOCATED');
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(404).json({ message: result.message });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});


app.post('/requests/:id/deliver', async (req, res) => {
    const { id: requestId } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.beginTransaction();

        // 1. Update the request status to FULFILLED
        await connection.execute(
            'UPDATE BloodRequests SET Status = "FULFILLED" WHERE RequestID = ?',
            [requestId]
        );

        // 2. Update the status of all bags associated with this request to Delivered
        await connection.execute(
            `UPDATE BloodBags SET Status = 'Delivered' WHERE BagID IN (SELECT BagID FROM requestbags WHERE RequestID = ?)`,
            [requestId]
        );

        await connection.commit();
        broadcastUpdate();
        res.status(200).json({ message: 'Request marked as delivered.' });
    } catch (error) {
        await connection.rollback();
        console.error(`Failed to mark request ${requestId} as delivered:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        await connection.end();
    }
});

app.post('/requests/:id/fulfill', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await updateRequestStatus(id, 'FULFILLED');
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(404).json({ message: result.message });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.post('/requests/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await cancelRequest(id);
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(409).json({ message: result.message }); // 409 Conflict for non-cancellable status
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.post('/requests/:id/reject', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await updateRequestStatus(id, 'REJECTED_BY_BLOODBANK');
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(404).json({ message: result.message });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/notifications', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM notifications ORDER BY CreatedAt DESC');
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/notifications/:role', async (req, res) => {
    const { role } = req.params;
    if (!['hospital', 'bloodBank'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified.' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT * FROM notifications WHERE RecipientRole = ? ORDER BY CreatedAt DESC';
        const [rows] = await connection.execute(query, [role]);
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.put('/notifications/:id', async (req, res) => {
    const { id } = req.params;
    const { isRead } = req.body;

    if (isRead === undefined) {
        return res.status(400).json({ message: 'isRead field is required.' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE notifications SET IsRead = ? WHERE NotificationID = ?', [isRead, id]);
        await connection.end();
        res.status(200).json({ message: 'Notification updated successfully.' });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/donors', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT DonorID, DonorName, BloodType FROM Donors');
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/inventory', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT b.BagID, b.DonorID, d.DonorName, b.BloodType, b.CollectionDate, b.ExpiryDate, b.Status as status FROM BloodBags b LEFT JOIN Donors d ON b.DonorID = d.DonorID ORDER BY b.ExpiryDate ASC");
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/inventory/expired', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT b.*, d.DonorName FROM BloodBags b JOIN Donors d ON b.DonorID = d.DonorID WHERE b.Status = 'Expired' ORDER BY b.ExpiryDate DESC");
        await connection.end();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/inventory/stats', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT BloodType, COUNT(*) as TotalBags FROM BloodBags WHERE Status = 'Available' GROUP BY BloodType");
        const totalBags = rows.reduce((acc, row) => acc + row.TotalBags, 0);
        const byBloodType = rows.reduce((acc, row) => {
            acc[row.BloodType] = row.TotalBags;
            return acc;
        }, {});
        await connection.end();
        res.status(200).json({ totalBags, byBloodType });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.post('/inventory', async (req, res) => {
    const { donorId, expiryDate, quantity = 1, status = 'Available' } = req.body;
    if (!donorId || !expiryDate) {
        return res.status(400).json({ message: 'Valid donor and expiry date are required.' });
    }
    if (quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be at least 1.' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        const [donorRows] = await connection.execute('SELECT BloodType FROM Donors WHERE DonorID = ?', [donorId]);
        if (donorRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Donor not found.' });
        }
        const bloodType = donorRows[0].BloodType;

        const insertQuery = "INSERT INTO BloodBags (DonorID, BloodType, CollectionDate, ExpiryDate, Status) VALUES (?, ?, NOW(), ?, ?)";
        
        for (let i = 0; i < quantity; i++) {
            await connection.execute(insertQuery, [donorId, bloodType, expiryDate, status]);
        }

        await connection.commit();
        
        res.status(201).json({ message: `${quantity} blood bag(s) added successfully with status '${status}'.` });

        if (status === 'Available') {
            checkEscalatedRequests(bloodType);
        }
        broadcastUpdate();

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.put('/bags/:id/dispose', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE BloodBags SET Disposed = TRUE WHERE BagID = ?', [id]);
        await connection.end();
        broadcastUpdate(); // This was already here, but let's make sure it's working as expected.
        res.status(200).json({ message: 'Bag marked as disposed.' });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.put('/bags/:id', async (req, res) => {
    const { id } = req.params;
    const { status, expiryDate } = req.body;
    
    let query = 'UPDATE BloodBags SET ';
    const params = [];

    if (status) {
        query += 'Status = ?';
        params.push(status);
    }

    if (expiryDate) {
        if (params.length > 0) query += ', ';
        query += 'ExpiryDate = ?';
        params.push(expiryDate);
    }

    if (params.length === 0) {
        return res.status(400).json({ message: 'No update fields provided.' });
    }

    query += ' WHERE BagID = ?';
    params.push(id);

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(query, params);
        await connection.end();
        broadcastUpdate();
        res.status(200).json({ message: 'Blood bag updated successfully.' });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.delete('/bags/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.beginTransaction();

        // Check the bag's status before deleting
        const [bags] = await connection.execute('SELECT Status FROM BloodBags WHERE BagID = ?', [id]);
        if (bags.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Blood bag not found.' });
        }

        const status = bags[0].Status;
        if (status !== 'Available' && status !== 'Expired') {
            await connection.rollback();
            return res.status(409).json({ message: `Cannot delete bag because its status is '${status}'. Only 'Available' or 'Expired' bags can be deleted.` });
        }

        await connection.execute('DELETE FROM BloodBags WHERE BagID = ?', [id]);
        await connection.commit();
        broadcastUpdate();
        res.status(200).json({ message: 'Blood bag deleted successfully.' });
    } catch (error) {
        await connection.rollback();
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
        await connection.end();
    }
});

app.post('/requests/:id/allocate', async (req, res) => {
    const { id: requestId } = req.params;
    const { bagIds } = req.body; // Expect an array of bag IDs

    if (!bagIds || !Array.isArray(bagIds) || bagIds.length === 0) {
        return res.status(400).json({ message: 'An array of bag IDs is required.' });
    }

    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.beginTransaction();

        // 1. Update the request status to ALLOCATED
        await connection.execute(
            'UPDATE BloodRequests SET Status = "ALLOCATED" WHERE RequestID = ?',
            [requestId]
        );

        // 2. Update the status of the selected bags to Allocated
        const placeholders = bagIds.map(() => '?').join(',');
        await connection.execute(
            `UPDATE BloodBags SET Status = 'Allocated' WHERE BagID IN (${placeholders})`,
            bagIds
        );

        // 3. Create records in the RequestBags junction table
        const insertJunctionQuery = 'INSERT INTO requestbags (RequestID, BagID) VALUES ?';
        const junctionValues = bagIds.map(bagId => [requestId, bagId]);
        await connection.query(insertJunctionQuery, [junctionValues]);

        await connection.commit();
        broadcastUpdate();
        res.status(200).json({ message: 'Bags allocated successfully.' });
    } catch (error) {
        await connection.rollback();
        console.error(`Failed to allocate bags for request ${requestId}:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        await connection.end();
    }
});

// --- Bag Reservation Logic ---
async function reserveBag(bagId, requestId) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.beginTransaction();

        // Check if the bag is available
        const [bags] = await connection.execute('SELECT Status FROM BloodBags WHERE BagID = ? FOR UPDATE', [bagId]);
        if (bags.length === 0 || bags[0].Status !== 'Available') {
            await connection.rollback();
            return { success: false, message: 'Blood bag is not available for reservation.' };
        }

        // Update bag status to RESERVED
        await connection.execute('UPDATE BloodBags SET Status = ?, RequestID = ? WHERE BagID = ?', ['RESERVED', requestId, bagId]);
        
        await connection.commit();
        console.log(`Blood bag ${bagId} reserved for request ${requestId}.`);
        broadcastUpdate();
        return { success: true, message: 'Blood bag reserved successfully.' };

    } catch (error) {
        await connection.rollback();
        console.error(`Failed to reserve bag ${bagId}:`, error);
        throw error;
    } finally {
        await connection.end();
    }
}

app.post('/requests/:id/reserve', async (req, res) => {
    const { id: requestId } = req.params;
    const { bagId } = req.body;

    if (!bagId) {
        return res.status(400).json({ message: 'Bag ID is required.' });
    }

    try {
        const result = await reserveBag(bagId, requestId);
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(409).json({ message: result.message }); // 409 Conflict
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// --- Debugging Endpoint ---
app.get('/debug/db-check', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SHOW TABLES;');
        const tables = rows.map(row => Object.values(row)[0]);
        res.status(200).json(tables);
    } catch (error) {
        console.error('Database Debug Check Error:', error);
        res.status(500).json({ message: 'Failed to check database', error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

server.listen(port, () => {
    console.log(`Server with socket.io listening at http://localhost:${port}`);
    updateExpiredBags(); // Initial check on startup
});