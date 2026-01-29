# EIP-7702 Skills

A specialized set of skills for implementing, testing, and interacting with EIP-7702 delegated accounts. Designed for AI agents to assist in blockchain development.

## Installation

You can add this skill to your project using the following command:

```bash
npx skills add melonask/eip-7702-skills
```

## Features

- **EIP-7702 Smart Contract**: A reference implementation (`BatchCallAndSponsor.sol`) that enables batch calls and sponsored transactions for EOAs.
- **Foundry Support**: Pre-configured guides and test suites (`BatchCallAndSponsor.t.sol`) using the `prague` hardfork and delegation cheatcodes.
- **Viem v2 Integration**: Step-by-step guides for signing authorizations and executing EIP-7702 transactions with the latest Viem APIs.
- **Sponsorship Workflow**: Complete logic for gasless token transfers where a relayer pays the gas fee for an EOA.

## Usage

Once installed, the skill provides expert guidance on:
1.  **Deploying Implementation Contracts**: Best practices for EIP-7702 compatible logic.
2.  **Signing Intents**: How to properly sign off-chain authorizations.
3.  **Testing**: How to simulate Pectra hardfork features in local development environments.

For detailed instructions, refer to the `SKILL.md` within the skill directory.
