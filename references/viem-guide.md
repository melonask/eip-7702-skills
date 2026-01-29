# Viem v2 EIP-7702 Guide

## Overview

EIP-7702 allows EOAs to designate a Smart Contract as their "implementation". In Viem v2, this is handled via the `authorizationList` property in transactions.

## 1. Setup Client

Initialize a `WalletClient` with an account. No experimental extensions are needed in Viem v2.23+.

```typescript
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const relay = privateKeyToAccount("0x...");

export const walletClient = createWalletClient({
  account: relay,
  chain: sepolia,
  transport: http(),
});
```

## 2. Sign Authorization

The EOA (`account`) must sign an authorization to designate the contract.

```typescript
import { type Address } from "viem";

const eoa = privateKeyToAccount("0x...");
const implementation = "0x..." as Address;

const authorization = await walletClient.signAuthorization({
  account: eoa,
  contractAddress: implementation,
});
```

## 3. Signing Inner Payloads (Raw Bytes)

If your implementation contract requires an inner signature and expects an Ethereum Signed Message, use `signMessage` with the `message.raw` property.

```typescript
import { toBytes, keccak256 } from "viem";

const digest = keccak256("0x1234..."); 

const signature = await eoa.signMessage({
  message: { raw: toBytes(digest) } 
});
```

## 4. Execute Contract Write (Sponsored)

A sponsor can execute a transaction on behalf of the EOA by passing the `authorizationList`.

```typescript
const hash = await walletClient.writeContract({
  abi,
  address: eoa.address,
  authorizationList: [authorization],
  functionName: "execute",
  args: [calls, signature],
});
```

## Full Integration Example

For a complete, runnable example using Bun and Anvil, refer to the bundled asset:
`assets/test-gasless.ts`

This script demonstrates:
- Deploying mock tokens.
- Alice (EOA) signing authorizations.
- Bob (Sponsor) paying for Alice's token transfer.
- Proper TypeScript typing and raw byte signing.
