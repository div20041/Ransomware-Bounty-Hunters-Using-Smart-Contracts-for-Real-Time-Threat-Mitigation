import express from "express";
import fileUpload from "express-fileupload";
import unzipper from "unzipper";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

// Required for __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const uploadDir = path.join(__dirname, "uploads");

// Middleware
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ClamAV Scan Function
function runClamScan(targetPath, callback) {
  const command = `clamdscan --fdpass "${targetPath}"`;
  exec(command, (error, stdout, stderr) => {
    if (error && !stdout.includes("FOUND")) {
      return callback(error, null);
    }
    const infected = stdout.includes("FOUND");
    callback(null, {
      infected,
      output: stdout,
      error: stderr,
    });
  });
}

// POST /scan-file
app.post("/scan-file", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;
    const timestampedName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, timestampedName);

    // Save the uploaded file
    await file.mv(filePath);

    // If ZIP file, unzip and scan
    if (file.name.endsWith(".zip")) {
      const extractDir = `${filePath}_unzipped`;
      fs.mkdirSync(extractDir);

      fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on("close", () => {
          runClamScan(extractDir, (err, result) => {
            if (err) {
              console.error("❌ Actual Scan Error:", err.message || result?.output);
              return res.status(500).json({ error: "Scan failed", details: err.message });
            }

            const message = result.infected
              ? "⚠️ Ransomware Detected!"
              : "✅ File is Clean";

            console.log(message);
            res.json({
              file: file.name,
              infected: result.infected,
              message,
              output: result.output,
            });
          });
        })
        .on("error", (err) => {
          console.error("❌ Unzip Error:", err.message);
          res.status(500).json({ error: "Failed to unzip file", details: err.message });
        });
    } else {
      // Scan regular file/folder/image/video
      runClamScan(filePath, (err, result) => {
        if (err) {
          console.error("❌ Actual Scan Error:", err.message || result?.output);
          return res.status(500).json({ error: "Scan failed", details: err.message });
        }

        const message = result.infected
          ? "⚠️ Ransomware Detected!"
          : "✅ File is Clean";

        console.log(message);
        res.json({
          file: file.name,
          infected: result.infected,
          message,
          output: result.output,
        });
      });
    }
  } catch (err) {
    console.error("❌ Unexpected Error:", err.message);
    res.status(500).json({ error: "Unexpected error", details: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 ClamAV API running at http://localhost:${PORT}`);
});
