import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

// 1. setup rpc connection
const connection = new Connection('http://127.0.0.1:8899', 'confirmed');

// 2. create utility function

// create keypair for test transaction
const sender = Keypair.generate();
const receiver = Keypair.generate();
console.log(`Create sender account: ${sender.publicKey.toBase58()}`);
console.log(`Create receiver account: ${receiver.publicKey.toBase58()}`);
console.log(`sender balance: ${await connection.getBalance(sender.publicKey)}`);
console.log(`receiver balance: ${await connection.getBalance(receiver.publicKey)}`);

// airdrop for sender
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
const airdropSignature = await connection.requestAirdrop(sender.publicKey, LAMPORTS_PER_SOL);
// wait confirm
await connection.confirmTransaction({
  blockhash,
  lastValidBlockHeight,
  signature: airdropSignature,
});
console.log('aridrop');
console.log(`sender balance: ${await connection.getBalance(sender.publicKey)}`);
console.log(`receiver balance: ${await connection.getBalance(receiver.publicKey)}`);

// 3. create and fund an account

// 4. create a memo transaction
const transferInstruction = SystemProgram.transfer({
  fromPubkey: sender.publicKey,
  toPubkey: receiver.publicKey,
  lamports: 1_000_000, // 0,001 SOL
});

// 5. estimate compute units
// 6. add compute unit limit instruction to the transaction
// create simulation instruction with placeholder compute unit limit
const simulationInstruction = [
  ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_400_000,
  }),
  ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1n,
  }),
  transferInstruction,
];
// create transaction for simulation
const simulateTransaction = new VersionedTransaction(
  new TransactionMessage({
    payerKey: sender.publicKey,
    recentBlockhash: blockhash,
    instructions: simulationInstruction,
  }).compileToV0Message()
);

// 7. calculate transaction fee
const simulationResponse = await connection.simulateTransaction(simulateTransaction);
const estimatedUnits = simulationResponse.value.unitsConsumed;
console.log(`Estimated compute units: ${estimatedUnits}`);

// 8. sign and send the transaction
// create final transaction with compute budget instructions
const computeUnitLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
  units: estimatedUnits!,
});

const computeUnitPriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1n,
});

// build transaction with all instructions
const messageV0 = new TransactionMessage({
  payerKey: sender.publicKey,
  recentBlockhash: blockhash,
  instructions: [computeUnitPriceInstruction, computeUnitLimitInstruction, transferInstruction],
}).compileToV0Message();

const fee = await connection.getFeeForMessage(messageV0);
console.log(`Transaction fee: ${fee.value} lamports`);

const transaction = new VersionedTransaction(messageV0);
transaction.sign([sender]);

console.log(
  `total before: ${(await connection.getBalance(receiver.publicKey)) + (await connection.getBalance(sender.publicKey))}`
);
console.log('transfer');
const transferSignature = await connection.sendTransaction(transaction);
// confirm transaction
await connection.confirmTransaction({
  blockhash,
  lastValidBlockHeight,
  signature: transferSignature,
});

// get balance
console.log(`sender balance: ${await connection.getBalance(sender.publicKey)}`);
console.log(`receiver balance: ${await connection.getBalance(receiver.publicKey)}`);

console.log(
  `total after: ${(await connection.getBalance(receiver.publicKey)) + (await connection.getBalance(sender.publicKey)) + fee.value!}`
);
