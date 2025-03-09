import fs from "fs";

/**
 * Reads the last N lines of a file efficiently without loading the entire file into memory
 * @param {string} filePath - The path to the log file.
 * @param {number} numLines - The number of lines to read from the end of the file.
 * @param {function} callback - The callback function (error, { lines, offset }).
 */
export function readLastLines(filePath, numLines, callback) {
  fs.stat(filePath, (err, stats) => {
    if (err) return callback(err);
    const fileSize = stats.size;
    const bufferSize = 1024; // read in chunks of 1KB (maybe inefficient)
    let buffer = Buffer.alloc(bufferSize);
    let position = fileSize;
    let lines = [];
    let leftover = "";

    fs.open(filePath, "r", (err, fd) => {
      if (err) return callback(err);

      function readChunk() {
        // Determine the bytes to read
        const bytesToRead = Math.min(bufferSize, position);
        position -= bytesToRead;
        fs.read(fd, buffer, 0, bytesToRead, position, (err, bytesRead) => {
          if (err) {
            fs.close(fd, () => {});
            return callback(err);
          }
          const chunk = buffer.slice(0, bytesRead).toString("utf8");
          // Combine current chunk with any leftover data from previous read
          const data = chunk + leftover;
          const chunkLines = data.split("\n");
          // The first element may be incomplete (from the previous chunk)
          leftover = chunkLines.shift(); // This is causing the last line to be sent twice ([TODO]: Fix)
          // Prepend new lines (since we're reading backwards)
          lines = chunkLines.concat(lines);

          // If we have enough lines or reached the beginning of the file
          if (lines.length >= numLines + 1 || position === 0) {
            // Remove potential empty string at the end if file ends with newline
            if (lines[lines.length - 1] === "") {
              lines.pop();
            }
            // Get exactly the last N lines
            const resultLines = lines.slice(-numLines);
            fs.close(fd, () => {});
            // Return current file size as the offset for subsequent reads
            return callback(null, { lines: resultLines, offset: fileSize });
          } else {
            if (position === 0) {
              if (leftover) {
                lines.unshift(leftover);
              }
              const resultLines = lines.slice(-numLines);
              fs.close(fd, () => {});
              return callback(null, { lines: resultLines, offset: fileSize });
            } else {
              readChunk();
            }
          }
        });
      }
      readChunk();
    });
  });
}

/**
 * Reads new content from a file starting from a given offset
 * @param {string} filePath - The path to the log file.
 * @param {number} offset - The offset from where to start reading
 * @param {function} callback - The callback function (error, { data, newOffset }).
 */
export function readFromOffset(filePath, offset, callback) {
  fs.stat(filePath, (err, stats) => {
    if (err) return callback(err);
    const fileSize = stats.size;
    if (fileSize <= offset) {
      // No new data to read
      return callback(null, { data: "", newOffset: offset });
    }
    const length = fileSize - offset;
    const buffer = Buffer.alloc(length);
    fs.open(filePath, "r", (err, fd) => {
      if (err) return callback(err);
      fs.read(fd, buffer, 0, length, offset, (err, bytesRead) => {
        fs.close(fd, () => {});
        if (err) return callback(err);
        const data = buffer.toString("utf8", 0, bytesRead);
        callback(null, { data, newOffset: fileSize });
      });
    });
  });
}
