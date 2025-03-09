import { useState, useEffect, useRef, useCallback } from "react";

// CSS styles for the container & btn. (tryin to keep the entire component code together)
const styles = {
  container: {
    width: "900px",
    height: "400px", // Fixed height to allow scrolling
    overflowY: "auto",
    border: "1px solid #ccc",
    padding: "10px",
    margin: "20px auto",
    background: "#f9f9f9",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
  },
  button: {
    display: "block",
    margin: "10px auto",
    padding: "8px 16px",
    fontSize: "16px",
  },
};

const LogViewer = () => {
  const [logs, setLogs] = useState([]); // log lines
  const [isPaused, setIsPaused] = useState(false); // log streaming toggler
  const wsRef = useRef(null); // WebSocket instance
  const containerRef = useRef(null);

  /**
   * Determines if the log container is scrolled near the bottom.
   * I am using a 50px tolerance to decide if auto-scrolling should happen (some people use 40px or even less as tolerance).
   */
  const isAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight < 50
    );
  }, []);

  /**
   * Scrolls the log container to the bottom.
   */
  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  /**
   * Handles incoming messages from the web socket.
   * Splits the received data into lines, and appends them to the current logs.
   * It auto-scrolls if the user is currently at the bottom. (less than 50px from the bottom in our case)
   */
  const handleMessage = useCallback(
    (event) => {
      const newData = event.data;
      // Splitting data by "\n" (assuming some messages may contain multiple lines)
      const newLines = newData.split("\n").filter((line) => line !== "");
      setLogs((prevLogs) => {
        const updatedLogs = [...prevLogs, ...newLines];
        return updatedLogs;
      });

      // Auto-scroll only if user is at (or near) the bottom
      if (isAtBottom()) {
        // Delaying scrollToBottom slightly to allow new logs to render
        setTimeout(() => scrollToBottom(), 100);
      }
    },
    [isAtBottom]
  );

  /**
   * Initializes the socket connection and event listeners
   */
  useEffect(() => {
    // Hardcoding URL for demo only
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("connected to server via websocket");
    };

    ws.onmessage = handleMessage;

    ws.onerror = (error) => {
      console.error("Socket error:", error);
    };

    ws.onclose = () => {
      console.log("closed ws connection");
    };

    // Cleanup socket on unmount
    return () => {
      ws.close();
    };
  }, [handleMessage]);

  /**
   * Toggles the pause/resume state.
   * Sends a message to the server to either pause or resume log streaming.
   */
  const togglePause = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("socket not connected.");
      return;
    }
    if (isPaused) {
      // Send `resume` command to server.
      // Server should then send the missed logs (if any)
      wsRef.current.send("resume");
    } else {
      // pause log streaming
      wsRef.current.send("pause");
    }
    setIsPaused(!isPaused);
  };

  /**
   * Checks for scroll events
   * If the user scrolls away from the bottom, we disable auto-scroll until they're back to bottom.
   */
  const handleScroll = () => {
    console.log("scrolling logs container");
  };

  return (
    <div>
      {/* Log container */}
      <div ref={containerRef} style={styles.container} onScroll={handleScroll}>
        {logs.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>

      {/* Toggle button */}
      <button style={styles.button} onClick={togglePause}>
        {isPaused ? "Play Log Streaming" : "Pause Log Streaming"}
      </button>

      {/* Scrollbar styles (for Webkit-based browsers), keeping it here for the time being */}
      <style>{`
        /* Custom scrollbar styling */
        div::-webkit-scrollbar {
          width: 10px;
        }
        div::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        div::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 5px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default LogViewer;
