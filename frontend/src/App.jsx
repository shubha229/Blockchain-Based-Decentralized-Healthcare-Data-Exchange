import { useCallback, useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  isAddress,
} from "ethers";

import "./App.css";
import { CONTRACT_ADDRESS } from "./contractConfig";
import abi from "./contract/HealthcareDataExchangeABI.json";

/* =========================================================
   ROLES
========================================================= */

const ROLE = {
  NONE: 0,
  PATIENT: 1,
  DOCTOR: 2,
  HOSPITAL: 3,
  ADMIN: 4,
};

const ROLE_NAMES = {
  0: "Unregistered",
  1: "Patient",
  2: "Doctor",
  3: "Hospital",
  4: "Administrator",
};

/* =========================================================
   RECORD TYPES
========================================================= */

const RECORD_TYPES = [
  { value: 0, label: "Prescription" },
  { value: 1, label: "Lab Report" },
  { value: 2, label: "Imaging" },
  { value: 3, label: "Discharge Summary" },
  { value: 4, label: "Vaccination" },
  { value: 5, label: "General Medical Record" },
];

/* =========================================================
   ERROR HANDLING
========================================================= */

function getErrorMessage(
  err,
  fallback = "Something went wrong."
) {
  if (!err) return fallback;

  if (err.reason) return err.reason;

  if (err.shortMessage) return err.shortMessage;

  if (err.info?.error?.message) {
    return err.info.error.message;
  }

  if (err.message) {
    const message = String(err.message);
    const lower = message.toLowerCase();

    if (
      lower.includes("user rejected") ||
      lower.includes("user denied")
    ) {
      return "Transaction rejected in MetaMask.";
    }

    if (lower.includes("already registered")) {
      return "This wallet is already registered.";
    }

    if (lower.includes("not registered")) {
      return "This wallet is not registered.";
    }

    if (lower.includes("inactive")) {
      return "This user is currently inactive.";
    }

    if (lower.includes("access denied")) {
      return "Access denied. Patient consent is required.";
    }

    if (lower.includes("only admin")) {
      return "Only the administrator can perform this action.";
    }

    if (lower.includes("execution reverted")) {
      return "Transaction reverted by the smart contract.";
    }

    return message;
  }

  return fallback;
}

/* =========================================================
   FIELD READER
========================================================= */

function readField(value, name, index) {
  if (value == null) return undefined;

  if (value[name] !== undefined) {
    return value[name];
  }

  return value[index];
}

/* =========================================================
   ROLE NORMALIZER
========================================================= */

function normalizeRole(value) {
  const n = Number(value);

  if (
    Number.isFinite(n) &&
    n >= 0 &&
    n <= 4
  ) {
    return n;
  }

  return ROLE.NONE;
}

/* =========================================================
   RECORD NORMALIZER
========================================================= */

function normalizeRecord(record, id) {
  return {
    id: Number(
      readField(record, "recordId", 0) ?? id
    ),

    patient: readField(
      record,
      "patient",
      1
    ),

    createdBy: readField(
      record,
      "createdBy",
      2
    ),

    recordType: Number(
      readField(
        record,
        "recordType",
        3
      ) ?? 0
    ),

    fileHash: readField(
      record,
      "fileHash",
      4
    ),

    storageReference: readField(
      record,
      "storageReference",
      5
    ),

    timestamp: Number(
      readField(
        record,
        "timestamp",
        6
      ) ?? 0
    ),

    active: Boolean(
      readField(
        record,
        "active",
        7
      )
    ),
  };
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {

  const [provider, setProvider] =
    useState(null);

  const [signer, setSigner] =
    useState(null);

  const [contract, setContract] =
    useState(null);

  const [account, setAccount] =
    useState("");

  const [role, setRole] =
    useState(ROLE.NONE);

  const [roleName, setRoleName] =
    useState("Not Connected");

  const [networkName, setNetworkName] =
    useState("");

  const [chainId, setChainId] =
    useState("");

  /* =======================================================
     DATA
  ======================================================= */

  const [records, setRecords] =
    useState([]);

  const [auditLogs, setAuditLogs] =
    useState([]);

  const [accessResult, setAccessResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* =======================================================
     HOSPITAL
  ======================================================= */

  const [patientAddress, setPatientAddress] =
    useState("");

  const [recordType, setRecordType] =
    useState(1);

  const [fileHash, setFileHash] =
    useState("");

  const [storageReference, setStorageReference] =
    useState("");

  /* =======================================================
     PATIENT CONSENT
  ======================================================= */

  const [consentRecordId, setConsentRecordId] =
    useState("");

  const [doctorAddress, setDoctorAddress] =
    useState("");

  const [expiryHours, setExpiryHours] =
    useState(24);

  /* =======================================================
     DOCTOR
  ======================================================= */

  const [accessRecordId, setAccessRecordId] =
    useState("");

  /* =======================================================
     ADMIN
  ======================================================= */

  const [newUserAddress, setNewUserAddress] =
    useState("");

  const [newUserRole, setNewUserRole] =
    useState(ROLE.PATIENT);

  const [removeUserAddress, setRemoveUserAddress] =
    useState("");

  /* =======================================================
     CLEAR ALERTS
  ======================================================= */

  const clearAlerts = () => {
    setMessage("");
    setError("");
  };

  /* =======================================================
     LOAD ROLE
  ======================================================= */

  const loadUserRole = useCallback(
    async (
      currentContract,
      address
    ) => {

      try {

        if (
          !currentContract ||
          !address
        ) {
          setRole(ROLE.NONE);

          setRoleName(
            ROLE_NAMES[ROLE.NONE]
          );

          return ROLE.NONE;
        }

        /* ADMIN */

        try {

          if (
            typeof currentContract.admin ===
            "function"
          ) {

            const adminAddress =
              await currentContract.admin();

            if (
              adminAddress &&
              adminAddress.toLowerCase() ===
              address.toLowerCase()
            ) {

              setRole(ROLE.ADMIN);

              setRoleName(
                ROLE_NAMES[ROLE.ADMIN]
              );

              return ROLE.ADMIN;
            }
          }

        } catch (adminError) {

          console.warn(
            "Admin check failed:",
            adminError
          );
        }

        /* NORMAL USER */

        if (
          typeof currentContract.getUser !==
          "function"
        ) {

          throw new Error(
            "getUser(address) is missing from the frontend ABI."
          );
        }

        const user =
          await currentContract.getUser(
            address
          );

        const rawRole =
          user?.role !== undefined
            ? user.role
            : user?.userRole !== undefined
            ? user.userRole
            : user?.[0];

        const detectedRole =
          normalizeRole(rawRole);

        /*
         * IMPORTANT:
         * If the role exists but active=false,
         * show the user as unregistered/inactive.
         */

        const active =
          Boolean(
            user?.active ??
            user?.[1] ??
            false
          );

        if (
          detectedRole !== ROLE.NONE &&
          !active
        ) {

          setRole(ROLE.NONE);

          setRoleName(
            "Inactive User"
          );

          return ROLE.NONE;
        }

        setRole(detectedRole);

        setRoleName(
          ROLE_NAMES[detectedRole]
        );

        return detectedRole;

      } catch (err) {

        console.error(
          "Role detection failed:",
          err
        );

        setRole(ROLE.NONE);

        setRoleName(
          ROLE_NAMES[ROLE.NONE]
        );

        return ROLE.NONE;
      }
    },
    []
  );

  /* =======================================================
     CONNECT WALLET
  ======================================================= */

  const connectWallet = useCallback(
    async () => {

      try {

        clearAlerts();

        if (!window.ethereum) {
          throw new Error(
            "MetaMask is not installed."
          );
        }

        if (
          !CONTRACT_ADDRESS ||
          !isAddress(CONTRACT_ADDRESS)
        ) {

          throw new Error(
            "Invalid contract address in contractConfig.js."
          );
        }

        const browserProvider =
          new BrowserProvider(
            window.ethereum
          );

        await browserProvider.send(
          "eth_requestAccounts",
          []
        );

        const currentSigner =
          await browserProvider.getSigner();

        const address =
          await currentSigner.getAddress();

        const network =
          await browserProvider.getNetwork();

        const currentContract =
          new Contract(
            CONTRACT_ADDRESS,
            abi,
            currentSigner
          );

        setProvider(
          browserProvider
        );

        setSigner(
          currentSigner
        );

        setContract(
          currentContract
        );

        setAccount(address);

        setNetworkName(
          network.name || "localhost"
        );

        setChainId(
          network.chainId.toString()
        );

        await loadUserRole(
          currentContract,
          address
        );

        setMessage(
          "Wallet connected successfully."
        );

      } catch (err) {

        console.error(err);

        setError(
          getErrorMessage(
            err,
            "Wallet connection failed."
          )
        );
      }
    },
    [loadUserRole]
  );

  /* =======================================================
     DISCONNECT
  ======================================================= */

  const disconnectWallet =
    useCallback(() => {

      setProvider(null);
      setSigner(null);
      setContract(null);

      setAccount("");

      setRole(
        ROLE.NONE
      );

      setRoleName(
        "Not Connected"
      );

      setNetworkName("");

      setChainId("");

      setRecords([]);

      setAuditLogs([]);

      setAccessResult(null);

      setMessage("");

      setError("");

    }, []);

  /* =======================================================
     METAMASK EVENTS
  ======================================================= */

  useEffect(() => {

    if (!window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged =
      async (accounts) => {

        if (
          !accounts ||
          accounts.length === 0
        ) {

          disconnectWallet();

          return;
        }

        try {

          clearAlerts();

          const browserProvider =
            new BrowserProvider(
              window.ethereum
            );

          const currentSigner =
            await browserProvider.getSigner();

          const address =
            await currentSigner.getAddress();

          const network =
            await browserProvider.getNetwork();

          const currentContract =
            new Contract(
              CONTRACT_ADDRESS,
              abi,
              currentSigner
            );

          setProvider(
            browserProvider
          );

          setSigner(
            currentSigner
          );

          setContract(
            currentContract
          );

          setAccount(address);

          setNetworkName(
            network.name ||
            "localhost"
          );

          setChainId(
            network.chainId.toString()
          );

          await loadUserRole(
            currentContract,
            address
          );

          setMessage(
            "Account switched successfully."
          );

        } catch (err) {

          console.error(err);

          setError(
            getErrorMessage(
              err,
              "Failed to switch wallet account."
            )
          );
        }
      };

    const handleChainChanged =
      () => {
        window.location.reload();
      };

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    window.ethereum.on(
      "chainChanged",
      handleChainChanged
    );

    return () => {

      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );

    };

  }, [
    loadUserRole,
    disconnectWallet,
  ]);

  /* =======================================================
     LOAD PATIENT RECORDS
  ======================================================= */

  async function loadPatientRecords() {

    if (
      !contract ||
      !account
    ) {
      return;
    }

    try {

      setLoading(true);

      setError("");

      if (
        typeof contract.getPatientRecords !==
        "function"
      ) {

        throw new Error(
          "getPatientRecords(address) is missing from the frontend ABI."
        );
      }

      const patientRecords =
        await contract.getPatientRecords(
          account
        );

      const loadedRecords =
        patientRecords.map(
          (record) => ({
            id: Number(
              record.recordId ??
              record[0]
            ),

            patient:
              record.patient ??
              record[1],

            createdBy:
              record.createdBy ??
              record[2],

            recordType:
              Number(
                record.recordType ??
                record[3]
              ),

            fileHash:
              record.fileHash ??
              record[4],

            storageReference:
              record.storageReference ??
              record[5],

            timestamp:
              Number(
                record.timestamp ??
                record[6]
              ),

            active:
              Boolean(
                record.active ??
                record[7]
              ),
          })
        );

      setRecords(
        loadedRecords
      );

    } catch (err) {

      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Unable to load patient records."
        )
      );

    } finally {

      setLoading(false);
    }
  }

  /* =======================================================
     AUTO LOAD PATIENT RECORDS
  ======================================================= */

  useEffect(() => {

    if (
      contract &&
      role === ROLE.PATIENT &&
      account
    ) {

      loadPatientRecords();
    }

  }, [
    contract,
    role,
    account,
  ]);

  /* =======================================================
     HOSPITAL - ADD RECORD
  ======================================================= */

  async function addMedicalRecord() {

    try {

      clearAlerts();

      if (
        role !== ROLE.HOSPITAL
      ) {

        throw new Error(
          "Only a registered hospital can add medical records."
        );
      }

      if (
        typeof contract?.addMedicalRecord !==
        "function"
      ) {

        throw new Error(
          "addMedicalRecord(...) is missing from the frontend ABI."
        );
      }

      if (
        !isAddress(
          patientAddress
        )
      ) {

        throw new Error(
          "Enter a valid patient wallet address."
        );
      }

      let formattedHash =
        fileHash.trim();

      if (!formattedHash) {

        throw new Error(
          "Enter the SHA-256 file hash."
        );
      }

      if (
        !formattedHash.startsWith("0x")
      ) {

        formattedHash =
          `0x${formattedHash}`;
      }

      if (
        !/^0x[0-9a-fA-F]{64}$/.test(
          formattedHash
        )
      ) {

        throw new Error(
          "File hash must contain exactly 64 hexadecimal characters."
        );
      }

      if (
        !storageReference.trim()
      ) {

        throw new Error(
          "Enter the storage reference."
        );
      }

      setLoading(true);

      const tx =
        await contract.addMedicalRecord(
          patientAddress,
          Number(recordType),
          formattedHash,
          storageReference.trim()
        );

      setMessage(
        `Transaction submitted: ${tx.hash}`
      );

      await tx.wait();

      setMessage(
        "Medical record added successfully."
      );

      setPatientAddress("");

      setFileHash("");

      setStorageReference("");

    } catch (err) {

      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Failed to add medical record."
        )
      );

    } finally {

      setLoading(false);
    }
  }

  /* =======================================================
     PATIENT - GRANT ACCESS
  ======================================================= */

  async function grantAccess() {

    try {

      clearAlerts();

      if (
        role !== ROLE.PATIENT
      ) {

        throw new Error(
          "Only the patient can grant access."
        );
      }

      if (
        typeof contract?.grantAccess !==
        "function"
      ) {

        throw new Error(
          "grantAccess(...) is missing from the frontend ABI."
        );
      }

      if (
        consentRecordId === ""
      ) {

        throw new Error(
          "Enter a record ID."
        );
      }

      if (
        !isAddress(
          doctorAddress
        )
      ) {

        throw new Error(
          "Enter a valid doctor wallet address."
        );
      }

      const recordId =
        Number(
          consentRecordId
        );

      const hours =
        Number(
          expiryHours
        );

      if (
        !Number.isInteger(
          recordId
        ) ||
        recordId < 1
      ) {

        throw new Error(
          "Record ID must be a positive integer."
        );
      }

      if (
        !Number.isFinite(hours) ||
        hours <= 0
      ) {

        throw new Error(
          "Access duration must be greater than zero."
        );
      }

      const expiry =
        Math.floor(
          Date.now() / 1000
        ) +
        Math.floor(
          hours * 3600
        );

      setLoading(true);

      const tx =
        await contract.grantAccess(
          recordId,
          doctorAddress,
          expiry
        );

      setMessage(
        `Transaction submitted: ${tx.hash}`
      );

      await tx.wait();

      setMessage(
        "Doctor access granted successfully."
      );

      setConsentRecordId("");

      setDoctorAddress("");

    } catch (err) {

      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Failed to grant access."
        )
      );

    } finally {

      setLoading(false);
    }
  }

  /* =======================================================
     PATIENT - REVOKE ACCESS
  ======================================================= */

  async function revokeAccess() {

    try {

      clearAlerts();

      if (
        role !== ROLE.PATIENT
      ) {

        throw new Error(
          "Only the patient can revoke access."
        );
      }

      if (
        typeof contract?.revokeAccess !==
        "function"
      ) {

        throw new Error(
          "revokeAccess(...) is missing from the frontend ABI."
        );
      }

      if (
        consentRecordId === ""
      ) {

        throw new Error(
          "Enter a record ID."
        );
      }

      if (
        !isAddress(
          doctorAddress
        )
      ) {

        throw new Error(
          "Enter a valid doctor wallet address."
        );
      }

      const recordId =
        Number(
          consentRecordId
        );

      if (
        !Number.isInteger(
          recordId
        ) ||
        recordId < 1
      ) {

        throw new Error(
          "Record ID must be a positive integer."
        );
      }

      setLoading(true);

      const tx =
        await contract.revokeAccess(
          recordId,
          doctorAddress
        );

      setMessage(
        `Transaction submitted: ${tx.hash}`
      );

      await tx.wait();

      setMessage(
        "Doctor access revoked successfully."
      );

    } catch (err) {

      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Failed to revoke access."
        )
      );

    } finally {

      setLoading(false);
    }
  }

  /* =======================================================
     DOCTOR - CHECK ACCESS
  ======================================================= */

  async function checkAccess() {

    try {

      clearAlerts();

      setAccessResult(null);

      if (
        role !== ROLE.DOCTOR
      ) {

        throw new Error(
          "Only a registered doctor can check access."
        );
      }

      if (
        typeof contract?.hasAccess !==
        "function"
      ) {

        throw new Error(
          "hasAccess(...) is missing from the frontend ABI."
        );
      }

      if (
        accessRecordId === ""
      ) {

        throw new Error(
          "Enter a record ID."
        );
      }

      const recordId =
        Number(
          accessRecordId
        );

      if (
        !Number.isInteger(
          recordId
        ) ||
        recordId < 1
      ) {

        throw new Error(
          "Record ID must be a positive integer."
        );
      }

      const allowed =
        await contract.hasAccess(
          recordId,
          account
        );

      setAccessResult({
        allowed: Boolean(
          allowed
        ),
      });

    } catch (err) {

      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Unable to check access."
        )
      );
    }
  }

  /* =======================================================
     DOCTOR - ACCESS RECORD
  ======================================================= */

  async function accessRecord() {

    try {

      clearAlerts();

      setAccessResult(null);

      if (
        role !== ROLE.DOCTOR
      ) {

        throw new Error(
          "Only a registered doctor can access records."
        );
      }

      if (
        typeof contract?.hasAccess !==
        "function" ||
        typeof contract?.accessRecord !==
        "function" ||
        typeof contract?.getRecord !==
        "function"
      ) {

        throw new Error(
          "One or more doctor functions are missing from the frontend ABI."
        );
      }

      if (
        accessRecordId === ""
      ) {

        throw new Error(
          "Enter a record ID."
        );
      }

      const recordId =
        Number(
          accessRecordId
        );

      if (
        !Number.isInteger(
          recordId
        ) ||
        recordId < 1
      ) {

        throw new Error(
          "Record ID must be a positive integer."
        );
      }

      setLoading(true);

      const allowed =
        await contract.hasAccess(
          recordId,
          account
        );

      if (!allowed) {

        setAccessResult({
          allowed: false,
        });

        throw new Error(
          "Access denied. Patient consent is required."
        );
      }

      const tx =
        await contract.accessRecord(
          recordId
        );

      setMessage(
        `Transaction submitted: ${tx.hash}`
      );

      await tx.wait();

      const record =
        await contract.getRecord(
          recordId
        );

      setAccessResult({
        allowed: true,

        record:
          normalizeRecord(
            record,
            recordId
          ),
      });

      setMessage(
        "Record accessed successfully. Audit event generated."
      );

    } catch (err) {

      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Record access failed."
        )
      );

    } finally {

      setLoading(false);
    }
  }

  /* =======================================================
     ADMIN - REGISTER / REACTIVATE USER
  ======================================================= */

  async function registerUser() {

    try {

      clearAlerts();

      if (
        role !== ROLE.ADMIN
      ) {

        throw new Error(
          "Only the administrator can register users."
        );
      }

      if (
        typeof contract?.registerUser !==
        "function"
      ) {

        throw new Error(
          "registerUser(...) is missing from the frontend ABI."
        );
      }

      if (
        typeof contract?.getUser !==
        "function"
      ) {

        throw new Error(
          "getUser(address) is missing from the frontend ABI."
        );
      }

      if (
        !isAddress(
          newUserAddress
        )
      ) {

        throw new Error(
          "Enter a valid wallet address."
        );
      }

      const selectedRole =
        Number(
          newUserRole
        );

      if (
        ![
          ROLE.PATIENT,
          ROLE.DOCTOR,
          ROLE.HOSPITAL,
        ].includes(
          selectedRole
        )
      ) {

        throw new Error(
          "Select Patient, Doctor, or Hospital."
        );
      }

      /*
       * CHECK BEFORE METAMASK
       */

      const existingUser =
        await contract.getUser(
          newUserAddress
        );

      const existingRole =
        Number(
          existingUser?.role ??
          existingUser?.[0] ??
          0
        );

      const isActive =
        Boolean(
          existingUser?.active ??
          existingUser?.[1] ??
          false
        );

      /*
       * ACTIVE USER
       */

      if (
        existingRole !== ROLE.NONE &&
        isActive
      ) {

        throw new Error(
          `This wallet is already registered as ${ROLE_NAMES[existingRole]}.`
        );
      }

      /*
       * INACTIVE USER
       * CAN BE REACTIVATED
       */

      setLoading(true);

      const tx =
        await contract.registerUser(
          newUserAddress,
          selectedRole
        );

      setMessage(
        `Transaction submitted: ${tx.hash}`
      );

      await tx.wait();

      if (
        existingRole !== ROLE.NONE &&
        !isActive
      ) {

        setMessage(
          `${ROLE_NAMES[selectedRole]} wallet reactivated successfully.`
        );

      } else {

        setMessage(
          `${ROLE_NAMES[selectedRole]} registered successfully.`
        );
      }

      setNewUserAddress("");

    } catch (err) {

      console.error(err);

      setError(
        getErrorMessage(
          err,
          "User registration failed."
        )
      );

    } finally {

      setLoading(false);
    }
  }

  /* =======================================================
     ADMIN - UNREGISTER USER
  ======================================================= */

  async function unregisterUser() {
    try {
      clearAlerts();

      if (role !== ROLE.ADMIN) {
        throw new Error(
          "Only the administrator can deactivate users."
        );
      }

      if (typeof contract?.deactivateUser !== "function") {
        throw new Error(
          "deactivateUser(address) is missing from the frontend ABI."
        );
      }

      if (typeof contract?.getUser !== "function") {
        throw new Error(
          "getUser(address) is missing from the frontend ABI."
        );
      }

      if (!isAddress(removeUserAddress)) {
        throw new Error("Enter a valid wallet address.");
      }

      // Administrator cannot deactivate itself
      if (
        removeUserAddress.toLowerCase() ===
        account.toLowerCase()
      ) {
        throw new Error(
          "The administrator cannot deactivate its own wallet."
        );
      }

      // Check the user BEFORE opening MetaMask
      const existingUser =
        await contract.getUser(removeUserAddress);

      const existingRole = Number(
        existingUser?.role ??
        existingUser?.[0] ??
        0
      );

      const isActive = Boolean(
        existingUser?.active ??
        existingUser?.[1] ??
        false
      );

      if (existingRole === ROLE.NONE) {
        throw new Error(
          "This wallet is not registered."
        );
      }

      if (!isActive) {
        throw new Error(
          `This ${ROLE_NAMES[existingRole]} is already inactive.`
        );
      }

      setLoading(true);

      // IMPORTANT:
      // Smart contract function is deactivateUser(),
      // NOT unregisterUser().
      const tx = await contract.deactivateUser(
        removeUserAddress
      );

      setMessage(
        `Deactivation transaction submitted: ${tx.hash}`
      );

      await tx.wait();

      setMessage(
        `${ROLE_NAMES[existingRole]} has been deactivated successfully.`
      );

      setRemoveUserAddress("");

    } catch (err) {
      console.error("Deactivate user error:", err);

      setError(
        getErrorMessage(
          err,
          "Failed to deactivate user."
        )
      );

    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     AUDIT LOGS
  ======================================================= */

  async function loadAuditLogs() {

    if (!contract) {
      return;
    }

    try {

      setLoading(true);

      setError("");

      const logs = [];

      const eventNames = [
        "UserRegistered",
        "UserReactivated",
        "UserDeactivated",
        "MedicalRecordAdded",
        "AccessGranted",
        "AccessRevoked",
        "RecordAccessed",
      ];

      for (
        const eventName of eventNames
      ) {

        try {

          if (
            !contract.filters?.[
              eventName
            ]
          ) {
            continue;
          }

          const filter =
            contract.filters[
              eventName
            ]();

          const events =
            await contract.queryFilter(
              filter
            );

          for (
            const event of events
          ) {

            logs.push({

              name:
                eventName,

              blockNumber:
                Number(
                  event.blockNumber
                ),

              transactionHash:
                event.transactionHash,
            });
          }

        } catch (
          eventError
        ) {

          console.warn(
            `Could not load ${eventName}:`,
            eventError
          );
        }
      }

      logs.sort(
        (a, b) =>
          b.blockNumber -
          a.blockNumber
      );

      setAuditLogs(
        logs
      );

    } catch (err) {

      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Unable to load audit events."
        )
      );

    } finally {

      setLoading(false);
    }
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function getRecordTypeName(
    value
  ) {

    return (
      RECORD_TYPES.find(
        (type) =>
          type.value ===
          Number(value)
      )?.label ||
      "Unknown"
    );
  }

  function formatDate(
    timestamp
  ) {

    if (!timestamp) {
      return "Unknown";
    }

    return new Date(
      Number(timestamp) * 1000
    ).toLocaleString();
  }

  function shortAddress(
    address
  ) {

    if (!address) {
      return "";
    }

    const text =
      String(address);

    if (
      text.length <= 12
    ) {
      return text;
    }

    return `${text.slice(
      0,
      6
    )}...${text.slice(-4)}`;
  }

  function shortHash(
    hash
  ) {

    if (!hash) {
      return "";
    }

    const text =
      String(hash);

    if (
      text.length <= 16
    ) {
      return text;
    }

    return `${text.slice(
      0,
      10
    )}...${text.slice(-6)}`;
  }

  /* =======================================================
     LANDING PAGE
  ======================================================= */

  if (!account) {

    return (
      <div className="app-shell landing-page">

        <div className="landing-card">

          <div className="landing-logo">

            <div className="brand-icon">
              🏥
            </div>

          </div>

          <span className="eyebrow">
            SECURE HEALTHCARE EXCHANGE
          </span>

          <h1>
            Healthcare Data Exchange
          </h1>

          <p className="landing-description">
            Secure healthcare records,
            patient-controlled consent,
            and transparent blockchain
            auditing — all in one place.
          </p>

          <div className="landing-features">

            <Feature
              icon="🔐"
              title="Patient Controlled"
              text="Patients decide who can access their records."
            />

            <Feature
              icon="⛓️"
              title="Blockchain Secured"
              text="Permissions and metadata are protected on-chain."
            />

            <Feature
              icon="📋"
              title="Transparent Audit"
              text="Record access creates a visible blockchain trail."
            />

          </div>

          <button
            className="primary-button large"
            onClick={
              connectWallet
            }
            disabled={
              loading
            }
          >
            🦊 Connect MetaMask
          </button>

          <div className="network-hint">

            <span>
              Local Hardhat Network
            </span>

            <span>
              •
            </span>

            <span>
              Chain ID 31337
            </span>

          </div>

          {error && (
            <div className="toast error">
              ✕ {error}
            </div>
          )}

        </div>

      </div>
    );
  }

  /* =======================================================
     DASHBOARD
  ======================================================= */

  return (

    <div className="app-shell">

      {/* TOP BAR */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-small">
            🏥
          </div>

          <div>

            <h2>
              HealthExchange
            </h2>

            <span>
              Decentralized Healthcare
            </span>

          </div>

        </div>

        <div className="wallet-area">

          <div className="network-pill">

            <span className="status-dot" />

            Localhost

          </div>

          <div className="wallet-pill">

            <span>
              ◉
            </span>

            {shortAddress(
              account
            )}

          </div>

          <button
            className="disconnect-button"
            onClick={
              disconnectWallet
            }
          >
            Disconnect
          </button>

        </div>

      </header>

      <main className="dashboard">

        {/* HERO */}

        <section className="welcome-card">

          <div className="welcome-content">

            <span className="eyebrow">
              SECURE HEALTHCARE EXCHANGE
            </span>

            <h1>
              Welcome back
            </h1>

            <p>
              Your healthcare workspace is
              customized according to your
              blockchain role.
            </p>

          </div>

          <div className="role-badge">

            <span className="status-dot" />

            {roleName}

          </div>

        </section>

        {/* STATS */}

        <section className="stats-grid">

          <Stat
            icon="👤"
            label="Connected Wallet"
            value={shortAddress(
              account
            )}
          />

          <Stat
            icon="🛡️"
            label="Your Role"
            value={roleName}
          />

          <Stat
            icon="⛓️"
            label="Network"
            value={`Localhost • ${chainId}`}
          />

        </section>

        {/* =====================================================
            PATIENT
        ===================================================== */}

        {role === ROLE.PATIENT && (

          <section>

            <SectionTitle
              icon="👤"
              title="Patient Dashboard"
              subtitle="Your records and consent controls."
            />

            <div className="two-column">

              {/* RECORDS */}

              <div className="panel">

                <PanelHeader
                  title="My Medical Records"
                  description="Healthcare records linked to your wallet."
                />

                <button
                  className="secondary-button"
                  onClick={
                    loadPatientRecords
                  }
                  disabled={
                    loading
                  }
                >
                  🔄 Refresh Records
                </button>

                {records.length === 0 ? (

                  <EmptyState
                    text={
                      loading
                        ? "Loading records..."
                        : "No medical records found."
                    }
                  />

                ) : (

                  <div className="record-list">

                    {records.map(
                      (
                        record
                      ) => (

                        <div
                          className="record-card"
                          key={
                            record.id
                          }
                        >

                          <div className="record-top">

                            <div>

                              <span className="record-number">
                                RECORD #
                                {
                                  record.id
                                }
                              </span>

                              <h3>
                                {
                                  getRecordTypeName(
                                    record.recordType
                                  )
                                }
                              </h3>

                            </div>

                            <span
                              className={
                                record.active
                                  ? "active-badge"
                                  : "inactive-badge"
                              }
                            >
                              ●{" "}
                              {
                                record.active
                                  ? "Active"
                                  : "Inactive"
                              }
                            </span>

                          </div>

                          <div className="record-details">

                            <p>

                              <span>
                                Created
                              </span>

                              {
                                formatDate(
                                  record.timestamp
                                )
                              }

                            </p>

                            <p>

                              <span>
                                Created By
                              </span>

                              {
                                shortAddress(
                                  record.createdBy
                                )
                              }

                            </p>

                          </div>

                          <div className="hash-box">

                            <span>
                              FILE HASH
                            </span>

                            <code>
                              {
                                record.fileHash
                              }
                            </code>

                          </div>

                          <div className="storage-box">

                            <span>
                              STORAGE REFERENCE
                            </span>

                            <code>
                              {
                                record.storageReference
                              }
                            </code>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

              {/* CONSENT */}

              <div>

                <div className="panel">

                  <PanelHeader
                    title="Grant Doctor Access"
                    description="Give a doctor temporary permission to access a record."
                  />

                  <Input
                    label="Record ID"
                    value={
                      consentRecordId
                    }
                    onChange={
                      setConsentRecordId
                    }
                    placeholder="Example: 1"
                  />

                  <Input
                    label="Doctor Wallet Address"
                    value={
                      doctorAddress
                    }
                    onChange={
                      setDoctorAddress
                    }
                    placeholder="0x..."
                  />

                  <Input
                    label="Access Duration"
                    type="number"
                    value={
                      expiryHours
                    }
                    onChange={
                      setExpiryHours
                    }
                    placeholder="24"
                  />

                  <button
                    className="primary-button full"
                    onClick={
                      grantAccess
                    }
                    disabled={
                      loading
                    }
                  >
                    🔐 Grant Access
                  </button>

                </div>

                <div className="panel danger-panel">

                  <PanelHeader
                    title="Revoke Doctor Access"
                    description="Immediately remove previously granted permission."
                  />

                  <Input
                    label="Record ID"
                    value={
                      consentRecordId
                    }
                    onChange={
                      setConsentRecordId
                    }
                    placeholder="Example: 1"
                  />

                  <Input
                    label="Doctor Wallet Address"
                    value={
                      doctorAddress
                    }
                    onChange={
                      setDoctorAddress
                    }
                    placeholder="0x..."
                  />

                  <button
                    className="danger-button full"
                    onClick={
                      revokeAccess
                    }
                    disabled={
                      loading
                    }
                  >
                    🚫 Revoke Access
                  </button>

                </div>

              </div>

            </div>

          </section>

        )}

        {/* =====================================================
            DOCTOR
        ===================================================== */}

        {role === ROLE.DOCTOR && (

          <section>

            <SectionTitle
              icon="🩺"
              title="Doctor Dashboard"
              subtitle="Access only records authorized by patients."
            />

            <div className="two-column">

              <div className="panel">

                <PanelHeader
                  title="Patient Record Access"
                  description="Enter a record ID to verify and access patient-authorized data."
                />

                <Input
                  label="Record ID"
                  value={
                    accessRecordId
                  }
                  onChange={
                    setAccessRecordId
                  }
                  placeholder="Example: 1"
                />

                <div className="button-row">

                  <button
                    className="secondary-button"
                    onClick={
                      checkAccess
                    }
                    disabled={
                      loading
                    }
                  >
                    🔍 Check Permission
                  </button>

                  <button
                    className="primary-button"
                    onClick={
                      accessRecord
                    }
                    disabled={
                      loading
                    }
                  >
                    🔓 Access Record
                  </button>

                </div>

                {accessResult && (

                  <div
                    className={
                      accessResult.allowed
                        ? "access-success"
                        : "access-denied"
                    }
                  >

                    <strong>

                      {
                        accessResult.allowed
                          ? "✓ Access Authorized"
                          : "✕ Access Denied"
                      }

                    </strong>

                    {accessResult.record && (

                      <div className="access-record">

                        <p>

                          <span>
                            Record Type
                          </span>

                          {
                            getRecordTypeName(
                              accessResult
                                .record
                                .recordType
                            )
                          }

                        </p>

                        <p>

                          <span>
                            Patient
                          </span>

                          {
                            shortAddress(
                              accessResult
                                .record
                                .patient
                            )
                          }

                        </p>

                        <p>

                          <span>
                            Created By
                          </span>

                          {
                            shortAddress(
                              accessResult
                                .record
                                .createdBy
                            )
                          }

                        </p>

                        <p>

                          <span>
                            File Hash
                          </span>

                          <code>
                            {
                              accessResult
                                .record
                                .fileHash
                            }
                          </code>

                        </p>

                        <p>

                          <span>
                            Storage Reference
                          </span>

                          <code>
                            {
                              accessResult
                                .record
                                .storageReference
                            }
                          </code>

                        </p>

                      </div>

                    )}

                  </div>

                )}

              </div>

              <div className="info-panel">

                <div className="info-icon">
                  🔐
                </div>

                <h3>
                  Patient Consent
                </h3>

                <p>
                  Doctors cannot access
                  patient records unless
                  valid consent exists.
                </p>

                <div className="workflow">

                  <WorkflowStep
                    number="1"
                    text="Hospital creates the record"
                  />

                  <WorkflowStep
                    number="2"
                    text="Patient grants doctor access"
                  />

                  <WorkflowStep
                    number="3"
                    text="Smart contract verifies permission"
                  />

                  <WorkflowStep
                    number="4"
                    text="Access is recorded on-chain"
                  />

                </div>

              </div>

            </div>

          </section>

        )}

        {/* =====================================================
            HOSPITAL
        ===================================================== */}

        {role === ROLE.HOSPITAL && (

          <section>

            <SectionTitle
              icon="🏥"
              title="Hospital Dashboard"
              subtitle="Create and associate medical records with registered patients."
            />

            <div className="two-column">

              <div className="panel">

                <PanelHeader
                  title="Add Medical Record"
                  description="Link healthcare metadata to a registered patient's wallet."
                />

                <Input
                  label="Patient Wallet Address"
                  value={
                    patientAddress
                  }
                  onChange={
                    setPatientAddress
                  }
                  placeholder="0x..."
                />

                <div className="input-group">

                  <label>
                    Record Type
                  </label>

                  <select
                    value={
                      recordType
                    }
                    onChange={
                      (e) =>
                        setRecordType(
                          Number(
                            e.target.value
                          )
                        )
                    }
                  >

                    {RECORD_TYPES.map(
                      (
                        type
                      ) => (

                        <option
                          key={
                            type.value
                          }
                          value={
                            type.value
                          }
                        >
                          {
                            type.label
                          }
                        </option>

                      )
                    )}

                  </select>

                </div>

                <Input
                  label="SHA-256 File Hash"
                  value={
                    fileHash
                  }
                  onChange={
                    setFileHash
                  }
                  placeholder="64 hexadecimal characters"
                />

                <Input
                  label="Storage Reference"
                  value={
                    storageReference
                  }
                  onChange={
                    setStorageReference
                  }
                  placeholder="local://medical_record_001.json"
                />

                <button
                  className="primary-button full"
                  onClick={
                    addMedicalRecord
                  }
                  disabled={
                    loading
                  }
                >
                  🏥 Add Medical Record
                </button>

              </div>

              <div className="info-panel">

                <div className="info-icon">
                  🛡️
                </div>

                <h3>
                  Privacy by Design
                </h3>

                <p>
                  Medical documents stay
                  outside the blockchain.
                  Only the required metadata
                  and cryptographic hash are
                  recorded.
                </p>

                <div className="privacy-list">

                  <div>
                    ✓ Patient wallet linked
                  </div>

                  <div>
                    ✓ File hash stored
                  </div>

                  <div>
                    ✓ Storage reference stored
                  </div>

                  <div>
                    ✓ Record creator stored
                  </div>

                  <div>
                    ✓ Medical document remains off-chain
                  </div>

                </div>

              </div>

            </div>

          </section>

        )}

        {/* =====================================================
            ADMIN
        ===================================================== */}

        {role === ROLE.ADMIN && (

          <section>

            <SectionTitle
              icon="⚙️"
              title="Administrator Dashboard"
              subtitle="Register, deactivate and reactivate platform participants."
            />

            <div className="two-column">

              {/* REGISTER */}

              <div className="panel">

                <PanelHeader
                  title="Register Participant"
                  description="Register a new wallet or reactivate a previously deactivated wallet."
                />

                <Input
                  label="Wallet Address"
                  value={
                    newUserAddress
                  }
                  onChange={
                    setNewUserAddress
                  }
                  placeholder="0x..."
                />

                <div className="input-group">

                  <label>
                    Platform Role
                  </label>

                  <select
                    value={
                      newUserRole
                    }
                    onChange={
                      (e) =>
                        setNewUserRole(
                          Number(
                            e.target.value
                          )
                        )
                    }
                  >

                    <option
                      value={
                        ROLE.PATIENT
                      }
                    >
                      Patient
                    </option>

                    <option
                      value={
                        ROLE.DOCTOR
                      }
                    >
                      Doctor
                    </option>

                    <option
                      value={
                        ROLE.HOSPITAL
                      }
                    >
                      Hospital
                    </option>

                  </select>

                </div>

                <button
                  className="primary-button full"
                  onClick={
                    registerUser
                  }
                  disabled={
                    loading
                  }
                >
                  👤 Register / Reactivate User
                </button>

              </div>

              {/* UNREGISTER */}

              <div className="panel danger-panel">

                <PanelHeader
                  title="Unregister User"
                  description="Deactivate an existing Patient, Doctor or Hospital wallet."
                />

                <Input
                  label="Registered Wallet Address"
                  value={
                    removeUserAddress
                  }
                  onChange={
                    setRemoveUserAddress
                  }
                  placeholder="0x..."
                />

                <button
                  className="danger-button full"
                  onClick={
                    unregisterUser
                  }
                  disabled={
                    loading
                  }
                >
                  🚫 Unregister User
                </button>

                <div className="admin-warning">

                  <strong>
                    ⚠️ Important
                  </strong>

                  <p>
                    Unregistering a user
                    deactivates the wallet.
                    Blockchain history and
                    medical records are not
                    deleted.
                  </p>

                  <p>
                    The same wallet can be
                    registered again later.
                  </p>

                </div>

              </div>

            </div>

            {/* ADMIN INFORMATION */}

            <div className="panel admin-info-panel">

              <PanelHeader
                title="Administrative Controls"
                description="The administrator manages platform membership."
              />

              <div className="privacy-list">

                <div>
                  ✓ Register Patient
                </div>

                <div>
                  ✓ Register Doctor
                </div>

                <div>
                  ✓ Register Hospital
                </div>

                <div>
                  ✓ Prevent duplicate active registration
                </div>

                <div>
                  ✓ Unregister / deactivate users
                </div>

                <div>
                  ✓ Reactivate previously deactivated wallets
                </div>

                <div>
                  ✓ Role-based access control
                </div>

              </div>

            </div>

          </section>

        )}

        {/* =====================================================
            UNREGISTERED
        ===================================================== */}

        {role === ROLE.NONE && (

          <section className="panel unregistered-panel">

            <div className="info-icon">
              🔒
            </div>

            <h2>
              Wallet Not Registered
            </h2>

            <p>
              This wallet is connected,
              but no active application role
              has been assigned.
            </p>

            <p>
              Switch MetaMask to a registered
              Patient, Doctor, Hospital or
              Administrator wallet.
            </p>

          </section>

        )}

        {/* =====================================================
            AUDIT TRAIL
        ===================================================== */}

        <section className="audit-section">

          <SectionTitle
            icon="📋"
            title="Blockchain Audit Trail"
            subtitle="Transparent activity generated by the smart contract."
          />

          <div className="panel">

            <button
              className="secondary-button"
              onClick={
                loadAuditLogs
              }
              disabled={
                loading
              }
            >
              🔄 Load Audit Events
            </button>

            {auditLogs.length === 0 ? (

              <EmptyState
                text="Load blockchain events to view the audit trail."
              />

            ) : (

              <div className="audit-list">

                {auditLogs.map(
                  (
                    log,
                    index
                  ) => (

                    <div
                      className="audit-item"
                      key={`${log.transactionHash}-${index}`}
                    >

                      <div className="audit-icon">

                        {
                          log.name ===
                          "MedicalRecordAdded"
                            ? "📄"
                            : log.name ===
                              "AccessGranted"
                            ? "🔓"
                            : log.name ===
                              "AccessRevoked"
                            ? "🚫"
                            : log.name ===
                              "RecordAccessed"
                            ? "👁️"
                            : log.name ===
                              "UserDeactivated"
                            ? "⛔"
                            : log.name ===
                              "UserReactivated"
                            ? "♻️"
                            : "👤"
                        }

                      </div>

                      <div className="audit-content">

                        <strong>
                          {
                            log.name
                          }
                        </strong>

                        <p>
                          Block #
                          {
                            log.blockNumber
                          }
                        </p>

                      </div>

                      <code>
                        {
                          shortHash(
                            log.transactionHash
                          )
                        }
                      </code>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>

      </main>

      {/* LOADING */}

      {loading && (

        <div className="loading-overlay">

          <div className="loading-card">

            <div className="spinner" />

            <h3>
              Processing Transaction
            </h3>

            <p>
              Confirm the transaction
              in MetaMask.
            </p>

          </div>

        </div>

      )}

      {/* SUCCESS */}

      {message && (

        <div className="toast success">
          ✓ {message}
        </div>

      )}

      {/* ERROR */}

      {error && (

        <div className="toast error">
          ✕ {error}
        </div>

      )}

    </div>
  );
}

/* =========================================================
   FEATURE
========================================================= */

function Feature({
  icon,
  title,
  text,
}) {

  return (

    <div className="feature-item">

      <div className="feature-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>

      </div>

    </div>
  );
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  icon,
  label,
  value,
}) {

  return (

    <div className="stat-card">

      <span className="stat-icon">
        {icon}
      </span>

      <div>

        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  icon,
  title,
  subtitle,
}) {

  return (

    <div className="section-title">

      <div className="section-icon">
        {icon}
      </div>

      <div>

        <h2>
          {title}
        </h2>

        <p>
          {subtitle}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   PANEL HEADER
========================================================= */

function PanelHeader({
  title,
  description,
}) {

  return (

    <div className="panel-header">

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   INPUT
========================================================= */

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {

  return (

    <div className="input-group">

      <label>
        {label}
      </label>

      <input
        type={type}
        value={
          value ?? ""
        }
        placeholder={
          placeholder
        }
        onChange={(e) =>
          onChange(
            type === "number"
              ? Number(
                  e.target.value
                )
              : e.target.value
          )
        }
      />

    </div>
  );
}

/* =========================================================
   WORKFLOW STEP
========================================================= */

function WorkflowStep({
  number,
  text,
}) {

  return (

    <div className="workflow-step">

      <span>
        {number}
      </span>

      <p>
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  text,
}) {

  return (

    <div className="empty-state">

      <div className="empty-icon">
        📂
      </div>

      <p>
        {text}
      </p>

    </div>
  );
}

export default App;