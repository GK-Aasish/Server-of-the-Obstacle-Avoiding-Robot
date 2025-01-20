const ws = new WebSocket("ws://localhost:8081");

ws.onopen = () => {
  console.log("WebSocket connection established");
};

ws.onmessage = (event) => {
  const updatedData = JSON.parse(event.data);

  for (const key in updatedData) {
    const valueCell = document.getElementById(`${key}Value`);
    if (valueCell) {
      valueCell.textContent = updatedData[key];
    }
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("WebSocket connection closed");
};
