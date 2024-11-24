const DocumentManagement = artifacts.require("DocumentManagement");

module.exports = function (deployer) {
    deployer.deploy(DocumentManagement);
};