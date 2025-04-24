module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (Ganache or Hardhat)
      port: 8545,            // Match the port you found earlier
      network_id: "*",       // Match any network id
    }
  },
  compilers: {
    solc: {
      version: "0.8.21",  // Use your contract's Solidity version
   }
  }
};

