import {
  BlockhashWithExpiryBlockHeight,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  RecentPrioritizationFees,
  Signer,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
// @ts-ignore
import { getSimulationComputeUnits } from '@solana-developers/helpers';
import { airdropAndConfirm, getLocalNetConnection } from './utils.js';

export async function buildOptimalTransaction(
  connection: Connection,
  instructions: Array<TransactionInstruction>,
  signer: Signer
) {
  const [microLamports, units, recentBlockhash] = (await Promise.all([
    // 1000 /* Get optimal priority fees - https://solana.com/developers/guides/advanced/how-to-use-priority-fees*/,
    connection.getRecentPrioritizationFees(), // 动态获取网络的优先级费用
    getSimulationComputeUnits(connection, instructions, signer.publicKey),
    connection.getLatestBlockhash(),
  ])) as [RecentPrioritizationFees[], number, BlockhashWithExpiryBlockHeight];

  console.log(`${microLamports[0].slot} ${microLamports[0].prioritizationFee}`);
  console.log(`${units}`);
  console.log(`${recentBlockhash.blockhash} ${recentBlockhash.lastValidBlockHeight}`);

  // 使用最新推荐的优先级费用
  const recommendedFee = microLamports[microLamports.length - 1]?.prioritizationFee || 100;
  console.log(`${recommendedFee}`);

  instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: recommendedFee }));
  // instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
  if (units) {
    // probably should add some margin of error to units
    instructions.unshift(
      // FIXME: 这里应该如何设置
      // 直接设置为units会直接报错，为什么预估的不准确了？
      // ComputeBudgetProgram.setComputeUnitLimit({ units: units }),
      // 为什么 + 150之后没问题了
      // A: instructions 里 还没有：ComputeBudgetProgram.setComputeUnitLimit 和
      // ComputeBudgetProgram.setComputeUnitPrice
      // TODO: 要为setComputeUnitPrice 添加额外的cu但是setComputeUnitLimit不用?
      ComputeBudgetProgram.setComputeUnitLimit({ units: units + 150 })
    );
  }

  return {
    transaction: new VersionedTransaction(
      new TransactionMessage({
        instructions,
        recentBlockhash: recentBlockhash.blockhash,
        payerKey: signer.publicKey,
      }).compileToV0Message()
    ),
    recentBlockhash,
  };
}

const connection = getLocalNetConnection();

const sender = Keypair.generate();
const receiver = Keypair.generate();

await airdropAndConfirm(connection, sender.publicKey, 10 * LAMPORTS_PER_SOL);

const transferInstruction = SystemProgram.transfer({
  fromPubkey: sender.publicKey,
  toPubkey: receiver.publicKey,
  lamports: 1_000_000, // 0,001 SOL
});

const result = await buildOptimalTransaction(connection, [transferInstruction], sender);

const tx = result.transaction;
tx.sign([sender]);

console.log(`final transaction: `, tx);
console.log(`message details: `, tx.message);

const blockMsg = await connection.getLatestBlockhash();

const transactionSignature = await connection.sendTransaction(tx);

const receipt = await connection.confirmTransaction({
  blockhash: blockMsg.blockhash,
  lastValidBlockHeight: blockMsg.lastValidBlockHeight,
  signature: transactionSignature,
});
console.log('receipt: ', receipt);

// get balance
console.log(`sender balance: ${await connection.getBalance(sender.publicKey)}`);
console.log(`receiver balance: ${await connection.getBalance(receiver.publicKey)}`);
