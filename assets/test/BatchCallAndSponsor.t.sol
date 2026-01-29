// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BatchCallAndSponsor.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock", "MCK") {}
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract BatchCallAndSponsorTest is Test {
    BatchCallAndSponsor public implementation;
    MockERC20 public token;

    uint256 internal constant ALICE_PK =
        0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    address payable internal constant ALICE_ADDRESS =
        payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);

    uint256 internal constant BOB_PK =
        0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    address payable internal constant BOB_ADDRESS =
        payable(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);

    function setUp() public {
        implementation = new BatchCallAndSponsor();
        token = new MockERC20();

        // Fund Alice with tokens but NO ETH (to simulate sponsored need)
        token.mint(ALICE_ADDRESS, 1000e18);
        // Bob has ETH to sponsor
        vm.deal(BOB_ADDRESS, 10 ether);
    }

    function testDirectExecution() public {
        // Alice needs some ETH for gas in direct execution
        vm.deal(ALICE_ADDRESS, 1 ether);

        BatchCallAndSponsor.Call[]
            memory calls = new BatchCallAndSponsor.Call[](1);
        calls[0] = BatchCallAndSponsor.Call({
            to: address(token),
            value: 0,
            data: abi.encodeCall(ERC20.transfer, (BOB_ADDRESS, 100e18))
        });

        vm.signAndAttachDelegation(address(implementation), ALICE_PK);

        vm.startPrank(ALICE_ADDRESS);
        BatchCallAndSponsor(ALICE_ADDRESS).execute(calls);
        vm.stopPrank();

        assertEq(token.balanceOf(BOB_ADDRESS), 100e18);
    }

    function testSponsoredExecution() public {
        // Alice has 0 ETH. Bob sponsors.

        BatchCallAndSponsor.Call[]
            memory calls = new BatchCallAndSponsor.Call[](1);
        calls[0] = BatchCallAndSponsor.Call({
            to: address(token),
            value: 0,
            data: abi.encodeCall(ERC20.transfer, (BOB_ADDRESS, 50e18))
        });

        // 1. Prepare signature for the contract logic (replay protection etc)
        // Alice's nonce starts at 0 for a fresh EOA delegation
        uint256 nonce = 0;
        bytes memory encodedCalls;
        for (uint256 i = 0; i < calls.length; i++) {
            encodedCalls = abi.encodePacked(
                encodedCalls,
                calls[i].to,
                calls[i].value,
                calls[i].data
            );
        }
        bytes32 digest = keccak256(abi.encodePacked(nonce, encodedCalls));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            digest
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            ALICE_PK,
            ethSignedMessageHash
        );
        bytes memory signature = abi.encodePacked(r, s, v);

        // 2. Prepare EIP-7702 Delegation
        Vm.SignedDelegation memory signedDelegation = vm.signDelegation(
            address(implementation),
            ALICE_PK
        );

        // 3. Bob executes
        vm.startBroadcast(BOB_PK);
        vm.attachDelegation(signedDelegation);

        BatchCallAndSponsor(ALICE_ADDRESS).execute(calls, signature);
        vm.stopBroadcast();

        assertEq(token.balanceOf(BOB_ADDRESS), 50e18);
    }
}
