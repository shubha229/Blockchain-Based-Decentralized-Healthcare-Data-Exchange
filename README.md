# 🏥 Decentralized Healthcare Data Exchange

A blockchain-based healthcare data exchange dApp that enables **patient-controlled access to medical records** using **Solidity, Hardhat, React, TypeScript/JavaScript, Ethers.js, and MetaMask**.

The system uses smart contracts to manage healthcare users, medical-record metadata, patient consent, access permissions, and blockchain audit events.

Actual medical files remain **off-chain**, while blockchain stores metadata, cryptographic hashes, permissions, and transaction history.

---

## 🚀 Features

### 👨‍💼 Administrator Features

* Register patients
* Register doctors
* Register hospitals
* Deactivate users
* Reactivate users
* View registered users
* Manage platform participants
* Control role registration

### 👤 Patient Features

* Connect wallet using MetaMask
* View personal medical records
* View medical-record metadata
* Grant doctor access
* Revoke doctor access
* View access permissions
* Control who can access records

### 🩺 Doctor Features

* Connect wallet using MetaMask
* Check authorization
* Request access to records
* Access authorized medical records
* View permitted record information
* Receive access denial when permission is missing or revoked

### 🏥 Hospital Features

* Connect hospital wallet
* Select registered patient
* Select record type
* Add file hash
* Add storage reference
* Create medical records
* Store medical-record metadata on-chain

### 🔐 Blockchain Features

* Solidity smart-contract-based access control
* Role-based authorization
* Patient-controlled consent
* Grant and revoke access
* Wallet-based identity
* SHA-256 file integrity verification
* Blockchain audit events
* Tamper-evident metadata
* Local Ethereum-compatible blockchain
* MetaMask transaction confirmation

---

## 📸 Screenshots

### Administrator Dashboard
<img width="1447" height="960" alt="image" src="https://github.com/user-attachments/assets/b3c31a65-769f-4338-8abc-4e502e768464" />

---

### Transaction In Progress for Registration
<img width="1918" height="955" alt="Screenshot 2026-08-23 174014" src="https://github.com/user-attachments/assets/5671f7c4-325d-4e54-ba0b-3b952826a59c" />

---

### Patient Dashboard
<img width="1919" height="966" alt="Screenshot 2026-08-23 174404" src="https://github.com/user-attachments/assets/0cdab8b9-de1a-4752-863c-f305745273f2" />

---

### Hospital Dashboard
<img width="1911" height="903" alt="Screenshot 2026-08-23 174320" src="https://github.com/user-attachments/assets/21c34bc5-ad37-49a8-9e51-7fbbc4e553da" />

---

### Doctor Dashboard
<img width="1919" height="972" alt="Screenshot 2026-08-23 174642" src="https://github.com/user-attachments/assets/a809e712-5403-4962-ba7f-81ecedbc4bba" />

---

### Blockchain Events and Audit Trail
<img width="1919" height="887" alt="Screenshot 2026-08-23 174105" src="https://github.com/user-attachments/assets/47a21052-af66-4e34-b324-7730eb3f7a74" />

---

### Patient Deactivation
<img width="1919" height="970" alt="Screenshot 2026-08-23 173846" src="https://github.com/user-attachments/assets/36b449f1-f8fe-48ce-ab78-6f822c7ae223" />

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* JavaScript / JSX
* CSS
* Ethers.js

### Blockchain

* Solidity
* Hardhat
* Ethereum-compatible local blockchain
* MetaMask

### Cryptography

* SHA-256

### Development

* Node.js
* VS Code
* Git
* Hardhat testing tools

### Data

* Synthetic healthcare records
* JSON-based sample medical records
* Off-chain record simulation

---

## 📁 Project Structure

```text
Decentralized-Healthcare-Data-Exchange/
│
├── contracts/
│   └── HealthcareDataExchange.sol
│
├── frontend/
│   ├── public/
│   │
│   ├── src/
│   │   ├── assets/
│   │   │
│   │   ├── contract/
│   │   │   └── HealthcareDataExchangeABI.json
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── contractConfig.js
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
│
├── hashes/
│   └── generate_hash.py
│
├── sample_records/
│   └── medical_record_001.json
│
├── scripts/
│   └── deploy.js
│
├── artifacts/
│
├── cache/
│   ├── build-info/
│   └── compile-cache.json
│
├── node_modules/
│
├── .gitignore
├── hardhat.config.ts
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
```

---

## ⚙️ Installation

Install:

* Node.js
* npm
* Git
* VS Code
* MetaMask

Check the installation:

```bash
node --version
npm --version
git --version
```

---

## 📥 Clone the Repository

```bash
git clone https://github.com/shubha229/Blockchain-Based-Decentralized-Healthcare-Data-Exchange
```

Navigate into the project:

```bash
cd Decentralized-Healthcare-Data-Exchange
```

Install blockchain dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

---

## 🔨 Compile the Smart Contract

From the project root:

```bash
npx hardhat compile
```

This compiles:

```text
contracts/HealthcareDataExchange.sol
```

Hardhat generates the required contract artifacts.

---

## ⛓️ Start Local Blockchain

Start the Hardhat local blockchain:

```bash
npx hardhat node
```

Hardhat will display:

* Development accounts
* Private keys
* RPC information
* Local blockchain network details

Keep this terminal running.

---

## 🚀 Deploy the Smart Contract

Open another terminal in the project root:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

After deployment, the terminal will display the contract address.

Example:

```text
HealthcareDataExchange deployed to:
0x...
```

Copy the deployed contract address into:

```text
frontend/src/contractConfig.js
```

---

## ⚛️ Run the Frontend

Navigate to the frontend:

```bash
cd frontend
```

Start the Vite development server:

```bash
npm run dev
```

Open the URL displayed by Vite.

Usually:

```text
http://localhost:5173
```

---

## 🦊 MetaMask

The application uses **MetaMask** for wallet connection and blockchain transactions.

Before interacting with the application:

1. Install MetaMask.
2. Connect your wallet.
3. Select the same network where the contract was deployed.
4. Import a Hardhat development account if using the local network.
5. Make sure the wallet has test ETH.
6. Connect the wallet to the application.

---

## 🔄 Application Flow

```text
Administrator
      │
      ├── Register Patient
      ├── Register Doctor
      └── Register Hospital
              │
              ▼
          Hospital
              │
              ├── Select Patient
              ├── Select Record Type
              ├── Add File Hash
              └── Add Storage Reference
                      │
                      ▼
              Medical Record
                      │
                      ▼
                   Patient
                      │
                      ├── View Record
                      ├── Grant Doctor Access
                      └── Revoke Doctor Access
                              │
                              ▼
                           Doctor
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              Authorized            Unauthorized
                    │                   │
                    ▼                   ▼
              Access Record        Access Denied
```

---

## 🏗️ System Architecture

```text
                    MetaMask
                       │
                       ▼
                React Frontend
                       │
                    Ethers.js
                       │
                       ▼
          HealthcareDataExchange.sol
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
      Users         Records        Consent
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                 Audit Events
                       │
                       ▼
                 Blockchain
                       │
                       ▼
                File Metadata
                       │
                       ▼
                  SHA-256
                       │
                       ▼
                Off-Chain File
```

---

## 🏗️ Smart Contract

The main smart contract is:

```text
contracts/HealthcareDataExchange.sol
```

The contract manages:

* User registration
* User roles
* User activation/deactivation
* Medical records
* Record metadata
* Patient consent
* Granting access
* Revoking access
* Access validation
* File hashes
* Blockchain events

---

## 📜 Smart Contract Functions

### User Management

```text
registerUser()
deactivateUser()
reactivateUser()
getUser()
getUserRole()
isUserActive()
```

### Medical Records

```text
addMedicalRecord()
getRecord()
getPatientRecords()
getRecordCount()
```

### Access Control

```text
grantAccess()
revokeAccess()
hasAccess()
getPermission()
accessRecord()
```

---

## 📢 Smart Contract Events

The contract generates events for important operations:

```text
UserRegistered
UserDeactivated
UserReactivated
MedicalRecordAdded
AccessGranted
AccessRevoked
RecordAccessed
```

These events provide a transparent blockchain-based audit trail.

---

## 🔎 SHA-256 Hash Verification

Actual medical files are not stored directly on the blockchain.

Instead:

```text
Medical File
     │
     ▼
   SHA-256
     │
     ▼
 File Hash
     │
     ▼
Blockchain Metadata
```
---

## 🔐 Security & Privacy

The system uses multiple security mechanisms:

* Role-based access control
* Wallet-based authentication
* Patient-controlled consent
* Doctor authorization checks
* Active-user validation
* Record-existence validation
* Access revocation
* SHA-256 integrity verification
* Blockchain audit events
* Smart-contract enforced permissions

### Important Security Considerations

**Hashing is not encryption.**

SHA-256 verifies file integrity but does not encrypt the original file.

**Wallets are not complete identity systems.**

Wallet addresses represent users within this educational prototype.

---

## 🧪 Testing

The project can be tested using Hardhat.

```bash
npx hardhat test
```
---

## 🖥️ Remix Demonstration

The smart contract can also be demonstrated using Remix IDE.

### Workflow

1. Open Remix IDE.
2. Create `HealthcareDataExchange.sol`.
3. Paste the smart contract.
4. Compile the contract.
5. Select Remix VM.
6. Deploy the contract.
7. Register Patient.
8. Register Doctor.
9. Register Hospital.
10. Add a synthetic medical record.
11. Attempt unauthorized Doctor access.
12. Grant Doctor access.
13. Access the record using Doctor.
14. Revoke Doctor access.
15. Attempt Doctor access again.
16. Verify access is denied.
17. Inspect blockchain transactions and events.

---

## 📊 Medical Record Structure

A medical record contains metadata such as:

```text
recordId
patient
createdBy
recordType
fileHash
storageReference
timestamp
active
```

Supported synthetic record types include:

* Prescription
* Lab Report
* Imaging
* Discharge Summary
* Vaccination Record
* General Medical Record

---

## ⚠️ Limitations

This project is an **educational prototype**.

### Synthetic Data

Only dummy/synthetic healthcare data is used.

### Local Blockchain

The primary development environment uses a local Hardhat blockchain.

### Off-Chain Storage

Actual medical documents are simulated using off-chain/local storage.

### No Real Hospital Integration

The project is not connected to real hospital systems.

### Wallet-Based Identity

Wallet addresses represent users within the prototype.

### Production Deployment

This project is not intended for production healthcare deployment.

---

## 🚀 Future Improvements

Possible future enhancements include:

* Encrypted off-chain storage
* Time-limited consent
* Purpose-based consent
* Healthcare API integration
* Integration with real healthcare organizations

---

## 💡 Key Innovation

The key innovation is making the **patient the controller of healthcare data access**.

```text
                 PATIENT
                    │
             Controls Consent
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     Grant Access        Revoke Access
          │                   │
          ▼                   ▼
       DOCTOR              DOCTOR
          │                   │
          ▼                   ▼
     Authorized             Denied
       Access               Access
```

Blockchain provides:

```text
Trust
  +
Authorization
  +
Integrity
  +
Auditability
```

---

## ⚠️ Disclaimer

This project is strictly for **educational and demonstration purposes**.

It uses **synthetic/dummy healthcare data only**.

It is not intended for:

* Real patient data
* Clinical use
* Medical diagnosis
* Production hospital deployment


---

## 👩‍💻 Author

**Shubhashree Baburaya Nayak**

Computer Science and Engineering Student

GitHub:

https://github.com/shubha229

---

## ⭐ Project Highlights

🏥 **Decentralized Healthcare Data Exchange**

⛓️ **Blockchain-Based Access Control**

👤 **Patient-Controlled Consent**

🏨 **Hospital Medical Record Management**

🩺 **Doctor Authorization**

🔐 **Hash-Based Integrity Verification**

📜 **Blockchain Audit Trail**

⚛️ **React Web3 Frontend**

🦊 **MetaMask Integration**

🛠️ **Hardhat Development**
