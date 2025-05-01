import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from './utils.js';

const connection = getLocalNetConnection();

const sender = Keypair.generate();
const recipient = Keypair.generate();

await airdropAndConfirm(connection, sender.publicKey);

// create instructions
const instructions = [
  ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  }),
  // Set priority fee (1 microLamports per compute unit)
  ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1,
  }),
  // transfer instruction
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipient.publicKey,
    lamports: 10000000,
  }),
];

// get latest blockhash for transaction
const latestBlockHash = await connection.getLatestBlockhash();

// create transaction using modern VersionTransation
const messageV0 = new TransactionMessage({
  payerKey: sender.publicKey,
  recentBlockhash: latestBlockHash.blockhash,
  instructions,
}).compileToV0Message();

const transaction = new VersionedTransaction(messageV0);
transaction.sign([sender]);

// send and confirm transaction
const transactionSignature = await connection.sendTransaction(transaction);
await connection.confirmTransaction({
  blockhash: latestBlockHash.blockhash,
  lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  signature: transactionSignature,
});

console.log(`sender balance: ${await connection.getBalance(sender.publicKey)}`);
console.log(`recipient balance: ${await connection.getBalance(recipient.publicKey)}`);
