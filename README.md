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
- **Request Headers**:
   - `Authorization`: Bearer {access_token}
- **Request Body (Form-Data)**:
   - `document`: File to be uploaded
   - `recipientAddress`: Ethereum address of document recipient

### 2. Get Document
- **Endpoint**: `POST http://localhost:3000/api/documents/get`
- **Purpose**: Retrieve a specific document
- **Request Headers**:
   - `Authorization`: Bearer {access_token}
- **Request Body**:
  ```json
  {
    "docId": "unique-document-identifier"
  }
  ```

### 3. Verify Document
- **Endpoint**: `POST http://localhost:3000/api/documents/verify`
- **Purpose**: Validate document authenticity
- **Request Headers**:
   - `Authorization`: Bearer {access_token}
- **Request Body**:
  ```json
  {
    "docId": "unique-document-identifier"
  }
  ```

### 4. Transfer Document Ownership
- **Endpoint**: `POST http://localhost:3000/api/documents/transfer`
- **Purpose**: Transfer document ownership between addresses
- **Request Headers**:
   - `Authorization`: Bearer {access_token}
- **Request Body**:
  ```json
  {
    "docId": "unique-document-identifier",
    "newOwner": "Ethereum address of document's current owner"
  }
  ```

### 5. Search Documents
- **Endpoint**: `POST http://localhost:3000/api/documents/search`
- **Purpose**: Search documents by issuer or recipient
- **Request Headers**:
   - `Authorization`: Bearer {access_token}
- **Request Body**:
  ```json
  {
    "recipientAddress": "Ethereum address of document recipient"
  }
  ```

## Authentication Flow
### 1. Generate Nonce Endpoint
- **Endpoint:** `http://localhost:3000/auth/generate-nonce`
- **HTTP Method:** POST
- **Purpose:** Generate a unique nonce for signature challenge
#### Request
```json
{
    "walletAddress": "0xUserWalletAddress"
}
```
#### Response
```json
{
    "nonce": "0xWalletAddress:Timestamp:RandomString"
}
```

### 2. Verify Signature Endpoint
- **Endpoint:** `http://localhost:3000/auth/verify-signature`
- **HTTP Method:** POST
- **Purpose:** Verify user's cryptographic signature and issue authentication tokens
#### Request Body
```json
{
    "walletAddress": "0xUserWalletAddress",
    "signature": "0xSignatureGeneratedByWallet",
    "nonce": "0xGeneratedNonceFromPreviousStep"
}
```
#### Response
```json
{
    "accessToken": "JWT_ACCESS_TOKEN",
    "refreshToken": "JWT_REFRESH_TOKEN"
}
```

### 3. Refresh Token Endpoint
- **Endpoint:** `http://localhost:3000/auth/refresh-token`
- **HTTP Method:** POST
- **Purpose:** Generate a new access token using a valid refresh token
#### Request Body
```json
{
    "refreshToken": "EXISTING_REFRESH_TOKEN"
}
```
#### Response
```json
{
    "accessToken": "NEW_JWT_ACCESS_TOKEN"
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
   git clone https://github.com/DocuChain-Document-Ownership-DApp/DocuChain-Backend.git
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
