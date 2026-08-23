import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();
    const [admin, patient, doctor, hospital] =
        await ethers.getSigners();
    console.log("Admin   :", admin.address);
    console.log("Patient :", patient.address);
    console.log("Doctor  :", doctor.address);
    console.log("Hospital:", hospital.address);
    const HealthcareDataExchange =
        await ethers.getContractFactory(
            "HealthcareDataExchange"
        );
    const contract =
        await HealthcareDataExchange.deploy();

    await contract.waitForDeployment();
    const contractAddress =
        await contract.getAddress();
    console.log(
        "\nHealthcareDataExchange deployed to:",
        contractAddress
    );

    await (
        await contract.registerUser(
            patient.address,
            1
        )
    ).wait();

    console.log("Patient registered.");

    await (
        await contract.registerUser(
            doctor.address,
            2
        )
    ).wait();

    console.log("Doctor registered.");

    await (
        await contract.registerUser(
            hospital.address,
            3
        )
    ).wait();

    console.log("Hospital registered.");

    console.log(
        "\nDeployment completed successfully."
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});