// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HealthcareDataExchange {

    // =============================================================
    // ENUMS
    // =============================================================

    enum Role {
        NONE,
        PATIENT,
        DOCTOR,
        HOSPITAL
    }

    enum RecordType {
        PRESCRIPTION,
        LAB_REPORT,
        IMAGING,
        DISCHARGE_SUMMARY,
        VACCINATION,
        GENERAL
    }

    // =============================================================
    // STRUCTS
    // =============================================================

    struct User {
        Role role;
        bool active;
        uint256 registeredAt;
    }

    struct MedicalRecord {
        uint256 recordId;
        address patient;
        address createdBy;
        RecordType recordType;
        bytes32 fileHash;
        string storageReference;
        uint256 timestamp;
        bool active;
    }

    struct Permission {
        bool allowed;
        uint256 expiresAt;
    }

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    address public admin;

    uint256 private nextRecordId = 1;

    mapping(address => User) public users;

    mapping(uint256 => MedicalRecord) private records;

    mapping(address => uint256[]) private patientRecords;

    /*
     * recordId => doctor => permission
     */
    mapping(uint256 => mapping(address => Permission))
        private permissions;

    // =============================================================
    // EVENTS
    // =============================================================

    event UserRegistered(
        address indexed user,
        Role role,
        uint256 timestamp
    );

    event UserDeactivated(
        address indexed user,
        Role role,
        uint256 timestamp
    );

    event UserReactivated(
        address indexed user,
        Role role,
        uint256 timestamp
    );

    event MedicalRecordAdded(
        uint256 indexed recordId,
        address indexed patient,
        address indexed hospital,
        bytes32 fileHash,
        RecordType recordType,
        string storageReference,
        uint256 timestamp
    );

    event AccessGranted(
        uint256 indexed recordId,
        address indexed patient,
        address indexed doctor,
        uint256 expiresAt
    );

    event AccessRevoked(
        uint256 indexed recordId,
        address indexed patient,
        address indexed doctor
    );

    event RecordAccessed(
        uint256 indexed recordId,
        address indexed patient,
        address indexed accessor,
        uint256 timestamp
    );

    // =============================================================
    // MODIFIERS
    // =============================================================

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "Only admin"
        );
        _;
    }

    modifier onlyPatient() {
        require(
            users[msg.sender].role == Role.PATIENT,
            "Only patient"
        );

        require(
            users[msg.sender].active,
            "Patient inactive"
        );

        _;
    }

    modifier onlyDoctor() {
        require(
            users[msg.sender].role == Role.DOCTOR,
            "Only doctor"
        );

        require(
            users[msg.sender].active,
            "Doctor inactive"
        );

        _;
    }

    modifier onlyHospital() {
        require(
            users[msg.sender].role == Role.HOSPITAL,
            "Only hospital"
        );

        require(
            users[msg.sender].active,
            "Hospital inactive"
        );

        _;
    }

    modifier recordExists(uint256 recordId) {
        require(
            records[recordId].active,
            "Record does not exist"
        );
        _;
    }

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor() {
        admin = msg.sender;

        // Admin is not automatically
        // registered as a healthcare user.
    }

    // =============================================================
    // ROLE MANAGEMENT
    // =============================================================

    /*
     * Register a new Patient, Doctor or Hospital.
     *
     * If the address was previously deactivated,
     * it can be registered again.
     */
    function registerUser(
        address userAddress,
        Role role
    )
        external
        onlyAdmin
    {
        require(
            userAddress != address(0),
            "Invalid address"
        );

        require(
            role != Role.NONE,
            "Invalid role"
        );

        require(
            userAddress != admin,
            "Admin cannot be healthcare user"
        );

        User storage existingUser = users[userAddress];

        /*
         * If user is already active,
         * don't allow duplicate registration.
         */
        require(
            !existingUser.active,
            "User already registered"
        );

        /*
         * If the address existed previously but
         * was deactivated, reactivate it.
         */
        if (existingUser.role != Role.NONE) {

            existingUser.role = role;
            existingUser.active = true;
            existingUser.registeredAt = block.timestamp;

            emit UserReactivated(
                userAddress,
                role,
                block.timestamp
            );

            return;
        }

        /*
         * Completely new user.
         */
        users[userAddress] = User({
            role: role,
            active: true,
            registeredAt: block.timestamp
        });

        emit UserRegistered(
            userAddress,
            role,
            block.timestamp
        );
    }

    /*
     * Deactivate a Patient, Doctor or Hospital.
     *
     * This does NOT delete blockchain history.
     */
    function deactivateUser(
        address userAddress
    )
        external
        onlyAdmin
    {
        require(
            userAddress != address(0),
            "Invalid address"
        );

        require(
            userAddress != admin,
            "Admin cannot be deactivated"
        );

        require(
            users[userAddress].role != Role.NONE,
            "User not registered"
        );

        require(
            users[userAddress].active,
            "User already inactive"
        );

        Role currentRole = users[userAddress].role;

        users[userAddress].active = false;

        emit UserDeactivated(
            userAddress,
            currentRole,
            block.timestamp
        );
    }

    /*
     * Alias for easier understanding from the frontend.
     *
     * "unregisterUser" actually deactivates the user.
     */
    function unregisterUser(
        address userAddress
    )
        external
        onlyAdmin
    {
        require(
            userAddress != address(0),
            "Invalid address"
        );

        require(
            userAddress != admin,
            "Admin cannot be unregistered"
        );

        require(
            users[userAddress].role != Role.NONE,
            "User not registered"
        );

        require(
            users[userAddress].active,
            "User already inactive"
        );

        Role currentRole = users[userAddress].role;

        users[userAddress].active = false;

        emit UserDeactivated(
            userAddress,
            currentRole,
            block.timestamp
        );
    }

    /*
     * Get user information.
     */
    function getUser(
        address userAddress
    )
        external
        view
        returns (
            Role role,
            bool active,
            uint256 registeredAt
        )
    {
        User memory user = users[userAddress];

        return (
            user.role,
            user.active,
            user.registeredAt
        );
    }

    /*
     * Check whether an address is currently active.
     */
    function isUserActive(
        address userAddress
    )
        external
        view
        returns (bool)
    {
        return users[userAddress].active;
    }

    /*
     * Get user's current role.
     */
    function getUserRole(
        address userAddress
    )
        external
        view
        returns (Role)
    {
        return users[userAddress].role;
    }

    // =============================================================
    // MEDICAL RECORD REGISTRATION
    // =============================================================

    /*
     * Only an active Hospital can add a medical record.
     */
    function addMedicalRecord(
        address patient,
        RecordType recordType,
        bytes32 fileHash,
        string calldata storageReference
    )
        external
        onlyHospital
        returns (uint256)
    {
        require(
            patient != address(0),
            "Invalid patient address"
        );

        require(
            users[patient].role == Role.PATIENT,
            "Address is not a patient"
        );

        require(
            users[patient].active,
            "Patient inactive"
        );

        require(
            fileHash != bytes32(0),
            "Hash cannot be empty"
        );

        require(
            bytes(storageReference).length > 0,
            "Storage reference required"
        );

        uint256 recordId = nextRecordId;

        records[recordId] = MedicalRecord({
            recordId: recordId,
            patient: patient,
            createdBy: msg.sender,
            recordType: recordType,
            fileHash: fileHash,
            storageReference: storageReference,
            timestamp: block.timestamp,
            active: true
        });

        patientRecords[patient].push(recordId);

        nextRecordId++;

        emit MedicalRecordAdded(
            recordId,
            patient,
            msg.sender,
            fileHash,
            recordType,
            storageReference,
            block.timestamp
        );

        return recordId;
    }

    // =============================================================
    // RECORD RETRIEVAL
    // =============================================================

    /*
     * View a medical record.
     *
     * Patient can always view their own record.
     * Authorized Doctor can view it.
     */
    function getRecord(
        uint256 recordId
    )
        external
        view
        recordExists(recordId)
        returns (
            uint256,
            address,
            address,
            RecordType,
            bytes32,
            string memory,
            uint256,
            bool
        )
    {
        MedicalRecord memory record = records[recordId];

        require(
            msg.sender == record.patient ||
            hasAccess(recordId, msg.sender),
            "Access denied"
        );

        return (
            record.recordId,
            record.patient,
            record.createdBy,
            record.recordType,
            record.fileHash,
            record.storageReference,
            record.timestamp,
            record.active
        );
    }

    /*
     * Auditable record access.
     *
     * This creates a transaction and therefore
     * emits RecordAccessed.
     */
    function accessRecord(
        uint256 recordId
    )
        external
        recordExists(recordId)
        returns (
            uint256,
            address,
            address,
            RecordType,
            bytes32,
            string memory,
            uint256,
            bool
        )
    {
        MedicalRecord memory record = records[recordId];

        require(
            msg.sender == record.patient ||
            hasAccess(recordId, msg.sender),
            "Access denied"
        );

        emit RecordAccessed(
            recordId,
            record.patient,
            msg.sender,
            block.timestamp
        );

        return (
            record.recordId,
            record.patient,
            record.createdBy,
            record.recordType,
            record.fileHash,
            record.storageReference,
            record.timestamp,
            record.active
        );
    }

    /*
     * Get all records belonging to a patient.
     *
     * Only the patient themselves can call this.
     */
    function getPatientRecords(
        address patient
    )
        external
        view
        returns (MedicalRecord[] memory)
    {
        require(
            msg.sender == patient,
            "Only patient can view list"
        );

        require(
            users[patient].role == Role.PATIENT,
            "Address is not patient"
        );

        require(
            users[patient].active,
            "Patient inactive"
        );

        uint256[] memory ids = patientRecords[patient];

        MedicalRecord[] memory result =
            new MedicalRecord[](ids.length);

        for (
            uint256 i = 0;
            i < ids.length;
            i++
        ) {
            result[i] = records[ids[i]];
        }

        return result;
    }

    /*
     * Get total number of records.
     */
    function getRecordCount()
        external
        view
        returns (uint256)
    {
        return nextRecordId - 1;
    }

    // =============================================================
    // ACCESS CONTROL
    // =============================================================

    /*
     * Patient grants a Doctor permission
     * to access a specific medical record.
     */
    function grantAccess(
        uint256 recordId,
        address doctor,
        uint256 expiresAt
    )
        external
        onlyPatient
        recordExists(recordId)
    {
        require(
            records[recordId].patient == msg.sender,
            "Not record owner"
        );

        require(
            doctor != address(0),
            "Invalid doctor"
        );

        require(
            users[doctor].role == Role.DOCTOR,
            "Address is not doctor"
        );

        require(
            users[doctor].active,
            "Doctor inactive"
        );

        require(
            expiresAt > block.timestamp,
            "Expiry must be future"
        );

        permissions[recordId][doctor] = Permission({
            allowed: true,
            expiresAt: expiresAt
        });

        emit AccessGranted(
            recordId,
            msg.sender,
            doctor,
            expiresAt
        );
    }

    /*
     * Patient revokes Doctor permission.
     */
    function revokeAccess(
        uint256 recordId,
        address doctor
    )
        external
        onlyPatient
        recordExists(recordId)
    {
        require(
            records[recordId].patient == msg.sender,
            "Not record owner"
        );

        require(
            doctor != address(0),
            "Invalid doctor"
        );

        permissions[recordId][doctor].allowed = false;

        emit AccessRevoked(
            recordId,
            msg.sender,
            doctor
        );
    }

    /*
     * Check whether a Doctor currently has permission.
     */
    function hasAccess(
        uint256 recordId,
        address doctor
    )
        public
        view
        returns (bool)
    {
        if (
            !records[recordId].active ||
            doctor == address(0)
        ) {
            return false;
        }

        /*
         * Patient automatically has access
         * to their own record.
         */
        if (
            records[recordId].patient == doctor
        ) {
            return true;
        }

        /*
         * Only an active Doctor can have
         * Doctor access.
         */
        if (
            users[doctor].role != Role.DOCTOR ||
            !users[doctor].active
        ) {
            return false;
        }

        Permission memory permission =
            permissions[recordId][doctor];

        if (!permission.allowed) {
            return false;
        }

        if (
            permission.expiresAt <= block.timestamp
        ) {
            return false;
        }

        return true;
    }

    /*
     * Get permission information.
     */
    function getPermission(
        uint256 recordId,
        address doctor
    )
        external
        view
        returns (
            bool allowed,
            uint256 expiresAt
        )
    {
        Permission memory permission =
            permissions[recordId][doctor];

        return (
            hasAccess(recordId, doctor),
            permission.expiresAt
        );
    }
}