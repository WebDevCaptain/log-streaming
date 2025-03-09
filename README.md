# Log Streamer

A simple log streaming service that monitors a log file and sends new log entries to connected clients.
Clients get logs in real-time using WebSockets.

---

## Features

- Real-time log streaming using WebSockets
- Pause/resume log streaming
- Multiple clients can connect to the server
- Log file monitoring for new log entries
- Efficiently streaming only last 10 log entries to clients and all the new log entries since last sent

---

## Limitations

- The log file must be present on the same machine as the socket server

---

## Usage

1. Start the server in the backend directory: `node index.js` or `pnpm run dev`

2. Start the React app in the frontend directory: `pnpm run dev`

3. Open a browser and navigate to `http://localhost:5173` and logs will be displayed in real-time. You can also use the pause/resume button to toggle log streaming.
