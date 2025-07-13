const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lifeline_db_1',
    port: 3306,
    multipleStatements: true
};

async function seedDatabase() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(sql);
        console.log('Database seeded successfully.');
    } catch (error) {
        console.error('Failed to seed database:', error);
    } finally {
        if (connection) await connection.end();
    }
}

seedDatabase();