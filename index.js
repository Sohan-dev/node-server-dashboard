const sql = require("mssql");
const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const { Server } = require("socket.io");

const config = {
  user: "sa",
  password: "12345678",
  server: "DELL-STA-SHUBHA/SQLEXPRESS",
  database: "GCP",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  port: 1433,
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001", // or "*" to allow everything for testing
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  console.log("React app connected:", socket.id);
});

// Function to fetch latest data
async function fetchLatestData() {
  try {
    let pool = await sql.connect(config);
    let result = await pool
      .request()
      .query(
        "SELECT TOP 1 Timestamp, Temperature FROM PlantProduction ORDER BY Timestamp DESC",
      );
    return result.recordset[0];
  } catch (err) {
    console.error(err);
  }
}

// Pull database every 5 seconds and emit to React
setInterval(async () => {
  const data = await fetchLatestData();
  if (data) {
    io.emit("plant-data", data);
    console.log("Emitted:", data);
  }
}, 5000);

async function getPivotedData(gapMinutes, startDate, endDate) {
  try {
    // 1. Connection Configuration
    const config = {
      user: "sa",
      password: "12345678",
      server: "DELL-STA-SHUBHA/SQLEXPRESS",
      database: "GCP",
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      port: 1433,
    };

    let pool = await sql.connect(config);

    // 2. Define the Query
    // Note: Using template literals for the structural $gap
    // and parameters for the $where values.
    const query = `
           WITH Bucketed AS (
    SELECT 
        -- This logic already truncates to the @gap minute
        DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, DateAndTime) / @gap) * @gap, 0) AS BucketTime,
        TagIndex,
        AVG(Val) AS Val
    FROM FloatTable
    WHERE 
        -- TRUNCATE seconds from the Table column and the Parameters
        DATEADD(MINUTE, DATEDIFF(MINUTE, 0, DateAndTime), 0) >= DATEADD(MINUTE, DATEDIFF(MINUTE, 0, @start), 0)
        AND 
        DATEADD(MINUTE, DATEDIFF(MINUTE, 0, DateAndTime), 0) <= DATEADD(MINUTE, DATEDIFF(MINUTE, 0, @end), 0)
    GROUP BY 
        DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, DateAndTime) / @gap) * @gap, 0), 
        TagIndex
)
SELECT *
FROM Bucketed
PIVOT (
    MAX(Val) FOR TagIndex IN (
        [2],[3],[5],[20],[31],[4],[6],[7],[8],[9],[10],[11],[12],
        [13],[14],[15],[16],[17],[18],[19],[21],[23],[24],[25],
        [26],[27],[28],[29],[30],[22]
    )
) AS p
ORDER BY BucketTime DESC;
        `;

    // 3. Execute with Parameters
    const result = await pool
      .request()
      .input("gap", sql.Int, gapMinutes)
      .input("start", sql.DateTime, startDate)
      .input("end", sql.DateTime, endDate)
      .query(query);

    return result.recordset;
  } catch (err) {
    console.error("SQL Error:", err);
    throw err;
  }
}

app.get("/api/pivoted-data", async (req, res) => {
  try {
    const result = await getPivotedData(
      15,
      "2025-07-27 06:00",
      "2025-07-27 14:00",
    );
    console.log(result);

    res.json(result);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/api/tagname", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT TagName FROM TagTable");
    const tagList = result.recordset.map((row, index) => {
      return {
        title: row.TagName,
        dataIndex: index.toString(),
      };
    });

    res.json(tagList.slice(2));
  } catch (err) {
    res.status(500).send(err.message);
  }
});
app.post("/api/history", async (req, res) => {
  try {
    const result = await getPivotedData(
      req.body.gap,
      req.body.fromDate,
      req.body.toDate,
    );
    console.log(result);
    res.json(result);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

server.listen(3000, () =>
  console.log("Server running on port http://localhost:3000"),
);
