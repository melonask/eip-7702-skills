import { createWalletClient, http, encodeFunctionData, parseEther, createPublicClient, erc20Abi, keccak256, encodePacked, toBytes, type Address } from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { anvil } from 'viem/chains'

/**
 * EIP-7702 Integration Test: Gasless Token Transfer
 * 
 * Requirements:
 * 1. Anvil running with Prague hardfork: `anvil --hardfork prague`
 * 2. Implementation & Token contracts deployed (see Deploy.s.sol)
 */

// --- CONFIGURATION ---
// Update these addresses after running your deployment script
const IMPLEMENTATION_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address
const TOKEN_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address

const BATCH_ABI = [
  {
    "type": "function",
    "name": "execute",
    "inputs": [
      {
        "name": "calls",
        "type": "tuple[]",
        "components": [
          { "name": "to", "type": "address" },
          { "name": "value", "type": "uint256" },
          { "name": "data", "type": "bytes" }
        ]
      },
      { "name": "signature", "type": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "nonce",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
] as const

async function main() {
  const publicClient = createPublicClient({ chain: anvil, transport: http() })

  // 1. Setup Accounts
  // Alice: The EOA that will be "upgraded". Starts with 0 ETH.
  const alice = privateKeyToAccount(generatePrivateKey())
  
  // Bob: The Sponsor. Has ETH to pay for gas.
  // (Using default Anvil Account #0 for gas)
  const bob = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
  const bobClient = createWalletClient({ account: bob, chain: anvil, transport: http() })

  // Charlie: The recipient
  const charlie = privateKeyToAccount(generatePrivateKey())

  console.log(`Alice: ${alice.address} (Upgrading...)`)
  console.log(`Bob:   ${bob.address} (Sponsoring...)`)
  console.log(`Charlie: ${charlie.address} (Recipient)`)

  // 2. Fund Alice with Tokens (Sponsor pays for the minting)
  console.log("Minting 100 tokens to Alice...")
  const mintHash = await bobClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: [{ name: 'mint', type: 'function', inputs: [{type:'address', name:'to'}, {type:'uint256', name:'amount'}], outputs: [], stateMutability: 'nonpayable' }] as const,
    functionName: 'mint',
    args: [alice.address, parseEther('100')]
  })
  await publicClient.waitForTransactionReceipt({ hash: mintHash })

  // 3. Prepare Batch Call (Alice wants to transfer 50 tokens to Charlie)
  const calls = [
    {
      to: TOKEN_ADDRESS,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [charlie.address, parseEther('50')]
      })
    }
  ]

  // 4. Sign Inner Intent (Contract-level authentication)
  // We sign a digest of the calls to satisfy BatchCallAndSponsor's security checks.
  const nonce = 0n // Fresh EOA
  let encodedCalls = '0x' as `0x${string}`
  for (const call of calls) {
     encodedCalls = encodePacked(
        ['bytes', 'address', 'uint256', 'bytes'],
        [encodedCalls, call.to, call.value, call.data]
     )
  }
  const digest = keccak256(encodePacked(['uint256', 'bytes'], [nonce, encodedCalls]))
  
  // IMPORTANT: use message.raw to sign the digest bytes directly
  const innerSignature = await alice.signMessage({
    message: { raw: toBytes(digest) }
  })

  // 5. Sign EIP-7702 Authorization (Protocol-level delegation)
  const authorization = await bobClient.signAuthorization({
    contractAddress: IMPLEMENTATION_ADDRESS,
    account: alice
  })

  // 6. Execute Sponsored Transaction
  // Bob calls Alice's address. The authorizationList upgrades Alice to the implementation.
  console.log("Sending Sponsored EIP-7702 Transaction...")
  const txHash = await bobClient.writeContract({
    abi: BATCH_ABI,
    address: alice.address,
    functionName: 'execute',
    args: [calls, innerSignature],
    authorizationList: [authorization]
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash })
  console.log(`Transaction Successful: ${txHash}`)

  // 7. Verification
  const balance = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [charlie.address]
  })
  
  console.log(`Charlie Final Balance: ${balance}`)
  if (balance === parseEther('50')) console.log("SUCCESS: Gasless transfer confirmed.")
}

main().catch(console.error)
