// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentManagement {
    struct Document {
        address issuer;
        address recipient;
        string ipfsHash;
        uint256 timestamp;
        bool isVerified;
    }

    mapping(bytes32 => Document) public documents;

    event DocumentIssued(bytes32 indexed docId, address indexed issuer, address indexed recipient, string ipfsHash);
    event OwnershipTransferred(bytes32 indexed docId, address indexed previousOwner, address indexed newOwner);

    function issueDocument(address _recipient, string memory _ipfsHash) public returns (bytes32) {
        bytes32 docId = keccak256(abi.encodePacked(_ipfsHash, block.timestamp));
        documents[docId] = Document(msg.sender, _recipient, _ipfsHash, block.timestamp, true);
        emit DocumentIssued(docId, msg.sender, _recipient, _ipfsHash);
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
}