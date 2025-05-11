// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentManagement {
    struct Document {
        address issuer;
        address recipient;
        string ipfsHash;
        string docCode;    // New field for document type code
        uint256 timestamp;
        bool isVerified;
    }

    mapping(bytes32 => Document) public documents;

    event DocumentIssued(
        bytes32 indexed docId,
        address indexed issuer,
        address indexed recipient,
        string ipfsHash,
        string docCode
    );
    event OwnershipTransferred(bytes32 indexed docId, address indexed previousOwner, address indexed newOwner);

    function issueDocument(address _recipient, string memory _ipfsHash, string memory _docCode) public returns (bytes32) {
        bytes32 docId = keccak256(abi.encodePacked(_ipfsHash, _docCode, block.timestamp));
        documents[docId] = Document(msg.sender, _recipient, _ipfsHash, _docCode, block.timestamp, true);
        emit DocumentIssued(docId, msg.sender, _recipient, _ipfsHash, _docCode);
        return docId;
    }

    function verifyDocument(bytes32 _docId) public view returns (bool) {
        return documents[_docId].isVerified;
    }

    function transferOwnership(bytes32 _docId, address _newOwner) public {
        require(documents[_docId].recipient == msg.sender, "Only the current owner can transfer ownership");
        address previousOwner = documents[_docId].recipient;
        documents[_docId].recipient = _newOwner;
        emit OwnershipTransferred(_docId, previousOwner, _newOwner);
    }

    function canAccessDocument(bytes32 _docId, address _user) public view returns (bool) {
        Document memory doc = documents[_docId];
        return (doc.issuer == _user || doc.recipient == _user);
    }

    function getDocumentCode(bytes32 _docId) public view returns (string memory) {
        return documents[_docId].docCode;
    }
}