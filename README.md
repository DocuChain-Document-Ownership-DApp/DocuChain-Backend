# DocuChain: Blockchain-Powered Document Management Platform 🔒📄
### _Revolutionizing Document and Property Management with Blockchain & NFTs_


## Overview

DocuChain is a cutting-edge, secure document management platform leveraging blockchain technology to provide immutable, verifiable, and transparent document handling. Built with Node.js, Ethereum, and IPFS, DocuChain ensures document integrity, traceability, and ownership verification.

## 🌟 Key Features

- **Immutable Document Storage**: Leverage blockchain's inherent security
- **Decentralized File Storage**: Utilize IPFS for distributed file management
- **Ownership Tracking**: Real-time document ownership transfer and verification
- **Comprehensive Logging**: Detailed audit trails for every document action
- **Secure Document Issuance**: Cryptographically signed and verifiable documents

## 🛠 Technology Stack

- **Backend**: Node.js, Express.js
- **Blockchain**: Ethereum, Solidity
- **File Storage**: IPFS
- **Database**: MongoDB
- **Logging**: Custom logging service
- **Smart Contracts**: Truffle Framework

## 📦 Project Structure

```
DocuChain-Backend/
│
├── build/
│   └── contracts/
│
├── logs/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── services/
│
└── truffle/
    ├── contracts/
    └── migrations/
```

## 🚀 Endpoints

### 1. Issue Document
- **Endpoint**: `POST http://localhost:3000/api/documents/issue`
- **Purpose**: Upload and register a new document on blockchain
- **Request Body (Form-Data)**:
    - `document`: File to be uploaded
    - `issuerAddress`: Ethereum address of document issuer
    - `recipientAddress`: Ethereum address of document recipient

### 2. Get Document
- **Endpoint**: `POST http://localhost:3000/api/documents/get`
- **Purpose**: Retrieve a specific document
- **Request Body**:
  ```json
  {
    "docId": "unique-document-identifier"
  }
  ```

### 3. Verify Document
- **Endpoint**: `POST http://localhost:3000/api/documents/verify`
- **Purpose**: Validate document authenticity
- **Request Body**:
  ```json
  {
    "docId": "unique-document-identifier"
  }
  ```

### 4. Transfer Document Ownership
- **Endpoint**: `POST http://localhost:3000/api/documents/transfer`
- **Purpose**: Transfer document ownership between addresses
- **Request Body**:
  ```json
  {
    "docId": "unique-document-identifier",
    "currentOwner": "Ethereum address of document's current owner",
    "newOwner": "Ethereum address of document's current owner"
  }
  ```

### 5. Search Documents
- **Endpoint**: `POST http://localhost:3000/api/documents/search`
- **Purpose**: Search documents by issuer or recipient
- **Request Body**:
  ```json
  {
    "issuerAddress": "Ethereum address of document issuer",
    "recipientAddress": "Ethereum address of document recipient"
  }
  ```

## 🔐 Security Features

- Ethereum address validation
- Multer-based file upload security
- IPFS decentralized storage
- Blockchain-based document verification
- Comprehensive error logging
- File size limitations (50MB)

## 📝 Prerequisites

- Node.js (v14+ recommended)
- MongoDB
- Ethereum Wallet
- Truffle
- IPFS Node

## 🛠 Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/docuchain.git
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env
   ```

4. Compile The Contracts
    ```bash
    npm run compile
    ```
5. Migrate the Contract
    ```bash
    npm run migrate
    ```

6. Start the server
   ```bash
   npm run start
   ```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE.md) file for details.

## 🙏 Acknowledgments

- Ethereum Foundation
- IPFS Team
- OpenZeppelin
- Truffle Suite

---

**Built with ❤️ by the DocuChain Team**