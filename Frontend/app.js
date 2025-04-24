let web3; 
let contract;
let userAccount;

// Replace this with your contract ABI
const abi = [
  {
    "inputs": [],
    "name": "getStatus",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  { 
    "inputs": [{ "internalType": "bool", "name": "detected", "type": "bool" }],
    "name": "reportRansomware",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  { 
    "inputs": [],
    "name": "status",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  }
];  // <-- Closing bracket added here

// Replace with your deployed contract address
const contractAddress = "0x4B3f20a45Ee24D3E90aBAc0FBBF8e996Dd3A5E65";

// Initialize web3 and contract
async function connectWallet() {
  if (window.ethereum) {
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
      web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      userAccount = accounts[0];
      document.getElementById("accountDisplay").innerText = `🔌 Connected: ${userAccount}`;
      contract = new web3.eth.Contract(abi, contractAddress);
    } catch (err) {
      console.error("User denied wallet access", err);
      document.getElementById("accountDisplay").innerText = "❌ Wallet connection failed";
    }
  } else {
    alert("Please install MetaMask!");
  }
}

async function getStatus() {
  if (!contract) return alert("Connect wallet first!");
  try {
    const status = await contract.methods.getStatus().call();
    document.getElementById("statusDisplay").innerText = `Status: ${status}`;
  } catch (err) {
    console.error("Error retrieving status:", err);
    document.getElementById("statusDisplay").innerText = "Error retrieving status!";
  }
}

// Report ransomware status to contract
async function reportRansomware(detected) {
  if (!contract) return alert("Connect wallet first!");
  try {
    await contract.methods.reportRansomware(detected).send({ from: userAccount });
    getStatus(); // update display
  } catch (err) {
    console.error("Error sending transaction:", err);
    alert("Error sending transaction!");
  }
}

async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) return alert("Please select a zip file.");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:5000/scan", {  // <-- Change this to /scan
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.infected) {  // Assuming the backend returns a field 'infected'
      await reportRansomware(true); // Ransomware detected
    } else {
      await reportRansomware(false); // No ransomware
    }
  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed.");
  }
}
