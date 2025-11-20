// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/Market.sol";
import "../src/MarketFactory.sol";
import "../src/AIOracle.sol";

/**
 * @title Deploy
 * @notice Deployment script for prediction market contracts on Base
 * @dev Run with: forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 */
contract Deploy is Script {
    // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    // Base Mainnet USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("Deployer balance:", deployer.balance);

        // Get configuration from environment
        address usdc = vm.envOr("USDC_ADDRESS", BASE_SEPOLIA_USDC);
        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);
        
        // AI signer addresses (should be set in .env)
        address aiSigner1 = vm.envAddress("AI_SIGNER_1");
        address aiSigner2 = vm.envAddress("AI_SIGNER_2");
        address aiSigner3 = vm.envAddress("AI_SIGNER_3");

        console.log("USDC Address:", usdc);
        console.log("Treasury:", treasury);
        console.log("Admin:", admin);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AI Oracle
        console.log("\n1. Deploying AI Oracle...");
        address[] memory signers = new address[](3);
        signers[0] = aiSigner1;
        signers[1] = aiSigner2;
        signers[2] = aiSigner3;
        
        AIOracle oracle = new AIOracle(signers, admin);
        console.log("AIOracle deployed at:", address(oracle));

        // 2. Deploy Market Implementation
        console.log("\n2. Deploying Market Implementation...");
        Market marketImpl = new Market();
        console.log("Market Implementation deployed at:", address(marketImpl));

        // 3. Deploy Factory
        console.log("\n3. Deploying Market Factory...");
        MarketFactory factory = new MarketFactory(
            usdc,
            address(oracle),
            treasury,
            address(marketImpl),
            admin
        );
        console.log("MarketFactory deployed at:", address(factory));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network:", block.chainid == 84532 ? "Base Sepolia" : "Base Mainnet");
        console.log("AIOracle:", address(oracle));
        console.log("Market Implementation:", address(marketImpl));
        console.log("MarketFactory:", address(factory));
        console.log("\nSave these addresses for frontend integration!");

        // Write to file for easy access
        string memory deploymentInfo = string.concat(
            "{\n",
            '  "chainId": "', vm.toString(block.chainid), '",\n',
            '  "oracle": "', vm.toString(address(oracle)), '",\n',
            '  "marketImplementation": "', vm.toString(address(marketImpl)), '",\n',
            '  "factory": "', vm.toString(address(factory)), '",\n',
            '  "usdc": "', vm.toString(usdc), '",\n',
            '  "treasury": "', vm.toString(treasury), '",\n',
            '  "admin": "', vm.toString(admin), '"\n',
            "}"
        );
        
        vm.writeFile("deployments/latest.json", deploymentInfo);
        console.log("\nDeployment info written to deployments/latest.json");
    }
}

/**
 * @title CreateMarket
 * @notice Script to create a test market
 */
contract CreateMarket is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        MarketFactory factory = MarketFactory(factoryAddress);

        // Create a test market
        string memory question = "Will Bitcoin reach $100,000 by end of 2025?";
        string memory category = "Crypto";
        uint256 endsAt = block.timestamp + 30 days;

        (address marketAddress, bytes32 marketId) = factory.createSimpleMarket(
            question,
            category,
            endsAt
        );

        vm.stopBroadcast();

        console.log("Market created!");
        console.log("Market Address:", marketAddress);
        console.log("Market ID:", vm.toString(marketId));
    }
}