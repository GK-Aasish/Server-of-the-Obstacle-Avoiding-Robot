const express = require("express");
const cors = require("cors");
const path = require("node:path");
const WebSocket = require("ws");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

const wss = new WebSocket.Server({ port: 8081 });

let sensorData = {
  forward: 0,
  backward: 0,
  left: 0,
  right: 0,
  distance: 0,
};

const broadcastData = () => {
  const data = JSON.stringify(sensorData);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");

  ws.send(JSON.stringify(sensorData));

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });

  ws.on("message", (message) => {
    console.log("Received message from client:", message);
  });
});

app.get("/", (req, res) => {
  res.render("index", { sensorData });
});

app.get("/data", (req, res) => {
  const params = req.query;
  const errors = [];
  console.log(params);

  Object.keys(params).forEach((key) => {
    const value = Number.parseFloat(params[key]);
    if (key in sensorData && !Number.isNaN(value)) {
      sensorData[key] = value;
    } else {
      errors.push(`Invalid key or value: ${key}=${params[key]}`);
    }
  });

  if (errors.length === 0) {
    broadcastData(); 
    res.status(200).send({ message: "Data updated successfully", sensorData });
  } else {
    res.status(400).send({ message: "Data update failed", errors });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:8081`);
});
