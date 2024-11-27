import loggerService from "../../src/services/loggerService.js";

const DocumentManagement = artifacts.require("DocumentManagement");

module.exports = function (deployer) {
    try {
        deployer.deploy(DocumentManagement);
        loggerService.info('DocumentManagement contract deployed successfully');
    } catch (error) {
        loggerService.error('Error deploying DocumentManagement contract:', error);
    }
};