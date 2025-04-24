const express = require("express");
const fileUpload = require("express-fileupload");
const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = 5000;
const uploadDir = path.join(__dirname, "uploads");

app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create upload directory if not exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Explain ClamAV signatures
function explainSignature(signature) {
  if (!signature) return "No signature provided.";
  if (signature.includes("Eicar-Signature")) {
    return "This file matches the Eicar test signature – a harmless file used to test antivirus software.";
  }
  if (signature.toLowerCase().includes("ransom")) {
    return "This file matches a known ransomware signature.";
  }
  return "This file matches a known malware signature: " + signature;
}

// Function to scan with ClamAV
function runClamScan(targetPath, callback) {
  const command = `clamdscan --fdpass "${targetPath}"`;
  exec(command, (error, stdout, stderr) => {
    const infected = stdout.includes("FOUND");
    let signatureMatch = null;

    // Try to extract signature
    const match = stdout.match(/: (.+) FOUND/);
    if (match && match[1]) {
      signatureMatch = match[1].trim();
    }

    callback(null, {
      infected,
      signature: signatureMatch,
      reason: explainSignature(signatureMatch),
      output: stdout,
      error: stderr,
    });
  });
}

// API endpoint
app.post("/scan-file", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;
    const timestampedName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, timestampedName);

    await file.mv(filePath);

    if (file.name.endsWith(".zip")) {
      const extractDir = `${filePath}_unzipped`;
      fs.mkdirSync(extractDir);

      fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on("close", () => {
          runClamScan(extractDir, (err, result) => {
            if (err) {
              return res.status(500).json({ error: "Scan failed", details: err.message });
            }
            res.json({
              file: file.name,
              infected: result.infected,
              signature: result.signature,
              reason: result.reason,
              output: result.output,
            });
          });
        })
        .on("error", (err) => {
          res.status(500).json({ error: "Failed to unzip file", details: err.message });
        });
    } else {
      runClamScan(filePath, (err, result) => {
        if (err) {
          return res.status(500).json({ error: "Scan failed", details: err.message });
        }
        res.json({
          file: file.name,
          infected: result.infected,
          signature: result.signature,
          reason: result.reason,
          output: result.output,
        });
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Unexpected error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ClamAV API running at http://localhost:${PORT}`);
});
