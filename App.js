// const id = require('nanoid')
const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");
const { Server } = require("socket.io");
const moment = require("moment");

const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.json();

const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: "*" } });
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001", // or "*" to allow everything for testing
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  console.log("React app connected:", socket.id);
});
const {
  mySqlConnection,
  connectToDb,
  executeQuery,
} = require("./src/Utils/db");

const dbConfig = {
  user: "sa",
  password: "12345678",
  server: "DELL-STA-SHUBHA/SQLEXPRESS",
  database: "productionDB",
  options: { encrypt: false, trustServerCertificate: true },
};

// Function to fetch latest data
async function fetchLatestData() {
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool
      .request()
      .query("SELECT TOP 1 * FROM PlantProduction ORDER BY Timestamp DESC");
    return result.recordset[0];
  } catch (err) {
    console.error(err);
  }
}

// Poll database every 5 seconds and emit to React
setInterval(async () => {
  const data = await fetchLatestData();
  if (data) {
    io.emit("plant-data", data);
    console.log("Emitted:", data.Temperature);
  }
}, 5000);

async function fetchData() {
  await connectToDb(); // Connect to the database
}

fetchData();

const allowedOrigins = [
  "http://localhost:3000", // Your React development server
  "http://localhost:3001",
];

const corsOptions = {
  // Check if the request origin is in the allowed list
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true); // Allow
    } else {
      callback(new Error("Not allowed by CORS")); // Block
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Allowed methods
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
};

app.use(cors(allowedOrigins));

// io.on("connection", (socket) => {
//   console.log("a user connected");
// });

{
  /*============== User List =================== */
}

// view engine setup
// app.set("views", path.join(__dirname, "views"));
// app.set("view engine", "jade");

var requestTime = function (req, res, next) {
  req.requestTime = Date.now();
  next();
};

app.use(requestTime);

{
  /* ============== GET all data =============== */
}
app.get("/energyData", function (req, res) {
  mySqlConnection.query("SELECT * FROM energyTable", (err, rows, fields) => {
    if (!err) {
      res.status(200).json({
        error: false,
        result: rows?.recordsets[0],
        time: moment(req.requestTime).format("MMMM Do YYYY, h:mm:ss a"),
        totalUser: rows?.recordsets[0]?.length,
        message: "Sucessfully found data",
      });
    } else {
      return res.status(400).json({
        error: false,
        result: {},
        message: "No such data found...",
      });
    }
  });
});

app.get("/getTagData/:id", function (req, res) {
  executeQuery("SELECT * FROM StringTable").then((data, err) => {
    if (!err) {
      const tagId = req?.params?.id;
      const newData = data?.filter((x) => {
        return x.TagIndex == tagId;
      });
      console.log(newData, ">>>>");
      res.status(200).json({
        error: false,
        result: newData,
        totalCount: newData?.length,
        time: moment(req.requestTime).format("MMMM Do YYYY, h:mm:ss a"),
        message: "Sucessfully found data",
      });
    } else {
      return res.status(400).json({
        error: true,
        result: err,
        message: "No such data found...",
      });
    }
  });
});

{
  /* Get all tag list */
}
app.get("/getTagList", function (req, res) {
  executeQuery("SELECT * FROM TagTable").then((data, err) => {
    if (!err) {
      console.log(data);
      res.status(200).json({
        error: false,
        result: data,
        totalCount: data?.length,
        time: moment(req.requestTime).format("MMMM Do YYYY, h:mm a"),
        message: "Tag list found sucessfully",
      });
    } else {
      return res.status(400).json({
        error: true,
        result: err,
        message: "No such data found...",
      });
    }
  });
});

app.post("/tagDetails", urlencodedParser, function (req, res) {
  const datas = req.body;
  console.log(datas);
  executeQuery(
    `SELECT * FROM FloatTable WHERE TagIndex = ${req.body.TagIndex} AND DateAndTime = ${req.body.dateTime}`,
  ).then((data, err) => {
    const params = req?.body;
    console.log(params);
    if (!err) {
      // console.log(data);
      res.status(200).json({
        error: false,
        result: data,
        //  totalCount: newData?.length,
        time: moment(req.requestTime).format("MMMM Do YYYY, h:mm:ss a"),
        message: "Sucessfully found data",
      });
    } else {
      return res.status(400).json({
        error: true,
        result: err,
        message: "No such data found...",
      });
    }
  });
});

module.exports = app;
