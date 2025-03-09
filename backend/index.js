import { WebSocketServer } from "ws";
import path from "path";

import { readLastLines, readFromOffset } from "./logFileReader.js";
import LogStreamer from "./logStreamer.js";

// hardcoding filename for now
const LOG_FILE_PATH = path.join(process.cwd(), "streaming.txt");

const logStreamer = new LogStreamer(LOG_FILE_PATH);

// websocket server
const wss = new WebSocketServer({ port: 8080 });

/**
 * Handles a new client connection.
 * - Sends the last 10 log lines upon connection.
 * - Sets up message handlers for pause/resume commands for log streaming controls from client.
 */
wss.on("connection", (ws) => {
  console.log("new client connected");

  // Init client state
  const client = {
    socket: ws,
    lastSentOffset: 0,
    paused: false,
  };

  // read and sending the last 10 lines from log file ([TODO]: slightly buggy)
  readLastLines(LOG_FILE_PATH, 10, (err, result) => {
    if (err) {
      console.error("Error reading last 10 lines:", err);
      ws.send("error reading log file");
      return;
    }

    // Both operations below must be atomic (ideally)

    // Send the last 10 lines as a string (newline-separated)
    ws.send(result.lines.join("\n"));
    // Set the client's lastSentOffset to the current end of file
    client.lastSentOffset = result.offset;
  });

  // adding client to a list for sending log updates later
  logStreamer.addClient(client);

  // Listen for messages from the client to control streaming
  ws.on("message", (message) => {
    message = message.toString();

    console.log("Received message from client:", message);
    // expecting "pause" or "resume"
    if (message === "pause") {
      client.paused = true;
      ws.send("Log streaming paused");
    } else if (message === "resume") {
      client.paused = false;
      ws.send("Resuming log streaming");
      // Immediately check for any new logs since last sent and send them (buggy, needs thorough testing)

      readFromOffset(LOG_FILE_PATH, client.lastSentOffset, (err, result) => {
        if (err) {
          console.error("Error reading log on resume", err);
          return;
        }
        if (result.data) {
          ws.send(result.data);
          client.lastSentOffset = result.newOffset;
        }
      });
    } else {
      ws.send('Unknown command. Use "pause" or "resume"');
    }
  });

  // Remove client from the subscriber list on disconnection
  ws.on("close", () => {
    console.log("Client disconnected");
    logStreamer.removeClient(client);
  });
});

console.log("WS server is running on ws://localhost:8080");
