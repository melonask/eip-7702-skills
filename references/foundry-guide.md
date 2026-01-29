# Foundry EIP-7702 Guide

## Configuration

Enable the `prague` hardfork in `foundry.toml`:

```toml
[profile.default]
evm_version = "prague"
```

## Cheatcodes

Foundry provides cheatcodes to simulate EIP-7702 behavior in tests.

### `signDelegation`

Signs an authorization for an implementation contract.

```solidity
Vm.SignedDelegation memory signedDelegation = vm.signDelegation(address(implementation), privateKey);
```

### `attachDelegation`

Attaches a signed delegation to the **next** transaction.

```solidity
vm.attachDelegation(signedDelegation);
```

### `signAndAttachDelegation`

Combines signing and attaching.

```solidity
vm.signAndAttachDelegation(address(implementation), privateKey);
```

## Testing Pattern

### 1. Sponsored Transaction Test

```solidity
function testSponsoredExecution() public {
    // 1. Sign Delegation (Alice authorizes Implementation)
    Vm.SignedDelegation memory signedDelegation = vm.signDelegation(address(implementation), ALICE_PK);

    // 2. Broadcast as Sponsor (Bob)
    vm.startBroadcast(BOB_PK);

    // 3. Attach Delegation
    vm.attachDelegation(signedDelegation);

    // 4. Call function on Alice's address (which is now delegated)
    // Note: You cast Alice's address to the Implementation interface
    BatchCallAndSponsor(ALICE_ADDRESS).execute(calls, signature);

    vm.stopBroadcast();
}
```

### 2. Direct Execution Test

```solidity
function testDirectExecution() public {
    // 1. Sign & Attach (Alice authorizes Implementation for her own tx)
    vm.signAndAttachDelegation(address(implementation), ALICE_PK);

    // 2. Prank/Broadcast as Alice
    vm.startPrank(ALICE_ADDRESS);

    // 3. Call function on Alice's address
    BatchCallAndSponsor(ALICE_ADDRESS).execute(calls);
    
    vm.stopPrank();
}
```
