import Web3 from 'web3';
import TruffleContract from '@truffle/contract';
import loggerService from '../services/loggerService.js';
import DocumentManagementArtifact from '../../build/contracts/DocumentManagement.json' assert { type: "json" };

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.GANACHE_URL));

const DocumentManagement = TruffleContract(DocumentManagementArtifact);
DocumentManagement.setProvider(web3.currentProvider);

const getAccounts = async () => {
    return await web3.eth.getAccounts();
};

const issueDocument = async (issuerAddress, recipientAddress, ipfsHash) => {
    try {
        const instance = await DocumentManagement.deployed();
        const accounts = await getAccounts();
        const result = await instance.issueDocument(recipientAddress, ipfsHash, { from: issuerAddress });
        loggerService.info(`Document issued: ${result.logs[0].args.docId}`);
        return result.logs[0].args.docId;
    } catch (error) {
        loggerService.error('Blockchain error in issueDocument:', error);
        throw error;
    }
};

const verifyDocument = async (docId) => {
    try {
        const instance = await DocumentManagement.deployed();
        return instance.verifyDocument(docId);
    } catch (error) {
        loggerService.error('Blockchain error in verifyDocument:', error);
        throw error;
    }
};

const transferOwnership = async (docId, currentOwner, newOwner) => {
    try {
        const instance = await DocumentManagement.deployed();
        const accounts = await getAccounts();
        await instance.transferOwnership(docId, newOwner, { from: currentOwner });
        loggerService.info(`Ownership transferred for document: ${docId}`);
        return true;
    } catch (error) {
        loggerService.error('Blockchain error in transferOwnership:', error);
        throw error;
    }
};

export { issueDocument, verifyDocument, transferOwnership };