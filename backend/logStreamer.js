import fs from "fs";
import { readFromOffset } from "./logFileReader.js";

/**
 * a log streamer that monitors a log file and streams new logs to connected clients.
 */
class LogStreamer {
  /**
   * Creates a LogStreamer.
   * @param {string} filePath - The path to the log file to monitor
   */
  constructor(filePath) {
    this.filePath = filePath;
    // Set of client objects: { socket, lastSentOffset, paused }
    this.clients = new Set();
    this.watchFile();
  }

  /**
   * Adds a client to the log streamer
   * @param {object} client - The client object with properties: socket, lastSentOffset, paused.
   */
  addClient(client) {
    this.clients.add(client);
  }

  /**
   * Removes a client from the log streamer
   * @param {object} client - The client object to remove
   */
  removeClient(client) {
    this.clients.delete(client);
  }

  /**
   * Notifies active (non-paused) clients of new log entries
   * For each client, reads from its `lastSentOffset` prop to current file end
   */
  notifyClients() {
    this.clients.forEach((client) => {
      if (!client.paused) {
        // only for clients that wanna get new logs
        readFromOffset(this.filePath, client.lastSentOffset, (err, result) => {
          if (err) {
            console.error("Error reading new log lines ", err);
            return;
          }
          if (result.data) {
            // Send new logs
            client.socket.send(result.data);

            client.lastSentOffset = result.newOffset;
          }
        });
      }
    });
  }

  /**
   * watches the log file for changes and triggers notifications to clients
   */
  watchFile() {
    fs.watch(this.filePath, (eventType, filename) => {
      if (eventType === "change") {
        this.notifyClients();
      }
    });
  }
}

export default LogStreamer;
