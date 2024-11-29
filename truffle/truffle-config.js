const loggerService = require('./truffleLogger.js');

module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
        },
    },
    compilers: {
        solc: {
            version: "0.8.0",
        },
    },
    contracts_build_directory: '../build/contracts',
};

// Optional: Log configuration details
loggerService.info('Truffle configuration loaded');