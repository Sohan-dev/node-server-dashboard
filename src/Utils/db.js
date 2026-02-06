const mySqlConnection = require("mssql");

const config = {
  user: "sa",
  password: "12345678",
  server: "DELL-STA-SHUBHA/SQLEXPRESS",
  database: "tata_logbook_1",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  port: 1433,
};

async function executeQuery(query) {
  console.log(query);
  try {
    const result = await mySqlConnection.query(query);
    return result.recordset;
  } catch (err) {
    console.error("Database query failed:", err);
    throw err;
  }
}

async function connectToDb() {
  try {
    await mySqlConnection.connect(config);
    console.log("Connected to SQL Server");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

module.exports = {
  mySqlConnection,
  executeQuery,
  connectToDb,
};
