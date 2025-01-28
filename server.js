const express = require('express');
const WebSocket = require('ws');
const cors = require("cors");

const bodyParser = require('body-parser');

const app = express();
const port = 5000;
app.use(cors());

// In-memory data storage
let sensorData = {
  temperature: 34.5,
  humidity: 15,
  gasLevel: 15,
  airQuality: 85,
  fireDetected: false,
};

let houseStatus = {
  doors: [
    { name: 'Bedroom', locked: true },
    { name: 'Kitchen', locked: true },
    { name: 'Hall', locked: false },
    { name: 'Front Door', locked: true }
  ],
  lights: [
    { name: 'Bedroom', on: false },
    { name: 'Kitchen', on: true },
    { name: 'Hall', on: false }
  ],
};

let controls = [
  { name: 'Light', isOn: true },
  { name: 'Fan', isOn: false },
  { name: 'Fridge', isOn: true },
  { name: 'Coffee', isOn: false },
  { name: 'TV', isOn: false },
  { name: 'Wi-Fi', isOn: true },
  { name: 'Power', isOn: true },
  { name: 'Lock', isOn: true }
];

let energyUsage = [
  { day: 'Mon', value: 20 },
  { day: 'Tue', value: 25 },
  { day: 'Wed', value: 30 },
  { day: 'Thu', value: 22 },
  { day: 'Fri', value: 28 },
  { day: 'Sat', value: 35 },
  { day: 'Sun', value: 32 }
];

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// WebSocket connection handler

// WebSocket connection handler
wss.on('connection', ws => {
    console.log('New WebSocket connection established');
    
    // Send initial data to the new client
    ws.send(JSON.stringify({ 
      sensorData, 
      houseStatus, 
      controls, 
      energyUsage 
    }));
  
    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        let updateData = {};
  
        // Handle different types of updates
        if (data.doors || data.lights) {
          if (data.doors) houseStatus.doors = data.doors;
          if (data.lights) houseStatus.lights = data.lights;
          updateData = { houseStatus };
        } 
        else if (data.name && 'isOn' in data) {
          const control = controls.find(c => c.name === data.name);
          if (control) {
            control.isOn = data.isOn;
            updateData = { controls };
          }
        }
        else if (data.day && 'value' in data) {
          const usage = energyUsage.find(u => u.day === data.day);
          if (usage) {
            usage.value = data.value;
            updateData = { energyUsage };
          }
        }
        else if (data.sensorData) {
          sensorData = { ...sensorData, ...data.sensorData };
          updateData = { sensorData };
        }
  
        // Broadcast the update to all clients
        if (Object.keys(updateData).length > 0) {
          const updateMessage = JSON.stringify(updateData);
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(updateMessage);
            }
          });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
  });

// Create Express server
app.use(bodyParser.json());

// /sensor-data endpoint
app.get('/sensor-data', (req, res) => {
  res.json(sensorData);
});

app.post('/sensor-data', (req, res) => {
  const { temperature, humidity, gasLevel, airQuality, fireDetected } = req.body;
  sensorData = { temperature, humidity, gasLevel, airQuality, fireDetected };
  
  // Broadcast new sensor data to all WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ sensorData }));
    }
  });
  
  res.status(200).send('Sensor data updated');
});

// /house-status endpoint
app.get('/house-status', (req, res) => {
  res.json({ doors: houseStatus.doors, lights: houseStatus.lights });
});

app.post('/house-status', (req, res) => {
  const { doors, lights } = req.body;
  houseStatus = { doors, lights };
  console.log(req.body)

  // Broadcast house status update to WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ houseStatus }));
    }
  });
  
  res.status(200).send('House status updated');
});

// /controls endpoint
app.get('/controls', (req, res) => {
  res.json(controls);
});

app.post('/controls', (req, res) => {
  const { name, isOn } = req.body;
  const control = controls.find(c => c.name === name);
  if (control) {
    control.isOn = isOn;
    
    // Broadcast controls update to WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ controls }));
      }
    });
    
    res.status(200).send('Control updated');
  } else {
    res.status(404).send('Control not found');
  }
});

// /energy-usage endpoint
app.get('/energy-usage', (req, res) => {
  res.json(energyUsage);
});

app.post('/energy-usage', (req, res) => {
  const { day, value } = req.body;
  const usage = energyUsage.find(u => u.day === day);
  if (usage) {
    usage.value = value;
    
    // Broadcast energy usage update to WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ energyUsage }));
      }
    });
    
    res.status(200).send('Energy usage updated');
  } else {
    res.status(404).send('Energy data not found');
  }
});

// Upgrade HTTP server to handle WebSocket connections
const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});
