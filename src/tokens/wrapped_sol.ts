// 与普通token使用流程类似：
// 1. 需要先创建token mint account
// 2. 创建ata account
// 3. 使用ata进行transfer
//
// 不同的是：
// 1. 无需创建token mint account, 使用内置的NATIVE_MINT
// 2. 需创建ata account
// 3. 有两种方式使用ata进行transfer
//	a) 使用SOL transfer
//	b) 使用Token transfer

import {
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import {
  ACCOUNT_SIZE,
  createInitializeAccountInstruction,
  createSyncNativeInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptAccount,
  getOrCreateAssociatedTokenAccount,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

async function transferBySol() {
  const connection = getLocalNetConnection();
  const feePayer = Keypair.generate();
  await airdropAndConfirm(connection, feePayer.publicKey, LAMPORTS_PER_SOL);

  const alice = Keypair.generate();
  await airdropAndConfirm(connection, alice.publicKey, 5 * LAMPORTS_PER_SOL);

  // create ata
  // getOrCreateAssociatedTokenAccount
  // const aliceATA = await getAssociatedTokenAddress(
  // FIXME: 确认一下目前是否只支持NATIVE_MINT + TOKEN_PROGRAM_ID 的组合？
  await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    NATIVE_MINT, // token mint account
    // NATIVE_MINT_2022, // token mint account
    alice.publicKey, // owner
    undefined,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
    // TOKEN_2022_PROGRAM_ID // 这个要和createSyncNativeInstruction的第二个参数保持一致
  );

  let aliceATA = await getAssociatedTokenAddress(
    NATIVE_MINT,
    // NATIVE_MINT_2022,
    alice.publicKey,
    undefined,
    TOKEN_PROGRAM_ID
    // TOKEN_2022_PROGRAM_ID
  );

  // Wrapped SOL's decimals is 9
  let amount = 1 * 1e9;

  let transferTx = new Transaction().add(
    // transfer SOL
    SystemProgram.transfer({
      fromPubkey: alice.publicKey,
      toPubkey: aliceATA,
      lamports: amount,
    }),

    // sync wrapped SOL balance
    // Construct a SyncNative instruction
    createSyncNativeInstruction(aliceATA, TOKEN_PROGRAM_ID)
    // createSyncNativeInstruction(aliceATA, TOKEN_2022_PROGRAM_ID)
  );

  const transferTxhash = await sendAndConfirmTransaction(connection, transferTx, [feePayer, alice]);
  console.log(`transfer(by sol) already confirmed, txhash: ${transferTxhash}`);

  const tokenAmountAfterTransfer = await connection.getTokenAccountBalance(aliceATA, 'confirmed');
  console.log("alice's ata token balance: ", tokenAmountAfterTransfer);

  const balanceOfSol = await connection.getBalance(alice.publicKey);
  console.log('balance of sol: ', balanceOfSol);
}

async function transferByToken() {
  const connection = getLocalNetConnection();
  const feePayer = Keypair.generate();
  await airdropAndConfirm(connection, feePayer.publicKey, 10 * LAMPORTS_PER_SOL);
  console.log('feePayer account: ', feePayer.publicKey.toBase58());

  const alice = Keypair.generate();
  await airdropAndConfirm(connection, alice.publicKey, 5 * LAMPORTS_PER_SOL);
  console.log('alice account: ', alice.publicKey.toBase58());

  // create ata
  // FIXME: 确认一下目前是否只支持NATIVE_MINT + TOKEN_PROGRAM_ID 的组合？
  await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    NATIVE_MINT, // token mint account
    alice.publicKey, // owner
    undefined,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );

  let aliceATA = await getAssociatedTokenAddress(
    NATIVE_MINT,
    alice.publicKey,
    undefined,
    TOKEN_PROGRAM_ID
  );

  console.log('alice ATA account: ', aliceATA.toBase58());

  let aliceATA2 = Keypair.generate();
  console.log('alice ATA 2 account: ', aliceATA2.publicKey.toBase58());

  // Wrapped SOL's decimals is 9
  let amount = 1 * 1e9;

  let transferTx = new Transaction().add(
    // create token account
    // 创建一个普通的账户
    // 1. 创建一个 Token Account：
    //	使用 SystemProgram.createAccount 创建一个新的账户，
    //	并为其分配足够的 lamports（包括租金豁免和希望封装的 SOL 数量）。
    SystemProgram.createAccount({
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: aliceATA2.publicKey,
      space: ACCOUNT_SIZE,
      lamports: (await getMinimumBalanceForRentExemptAccount(connection)) + 3 * amount, // rent + amount
      programId: TOKEN_PROGRAM_ID,
    }),
    // init token account
    // 2. 初始化为ATA
    //	初始化为 Token Account：
    //	使用 createInitializeAccountInstruction
    //	将该账户初始化为与 NATIVE_MINT（wSOL 的 mint 地址）关联的 Token
    createInitializeAccountInstruction(
      aliceATA2.publicKey,
      NATIVE_MINT,
      alice.publicKey,
      TOKEN_PROGRAM_ID
    ),
    // transfer WSOL
    createTransferInstruction(
      aliceATA2.publicKey, //从这个账户转
      aliceATA, // 转给这个账户
      alice.publicKey, // from 账户的woner
      amount,
      undefined,
      TOKEN_PROGRAM_ID
    )
  );

  const transferTxhash = await sendAndConfirmTransaction(connection, transferTx, [
    feePayer,
    aliceATA2,
    alice,
  ]);
  console.log(`transfer(by token) already confirmed, txhash: ${transferTxhash}`);

  const tokenAmountAfterTransfer = await connection.getTokenAccountBalance(aliceATA, 'confirmed');
  console.log("alice's ata token balance: ", tokenAmountAfterTransfer);

  const aliceATA2TokenAmountAfterTransfer = await connection.getTokenAccountBalance(
    aliceATA2.publicKey,
    'confirmed'
  );
  console.log("alice's ata2 token balance: ", aliceATA2TokenAmountAfterTransfer);

  const aliceATA2BalanceOfSol = await connection.getBalance(aliceATA2.publicKey);
  // 这个查询出来的比上面的多，多出来的是rent，没有被wrap为WSOL
  console.log("aliceATA2's balance of sol: ", aliceATA2BalanceOfSol);

  const balanceOfSol = await connection.getBalance(alice.publicKey);
  console.log("alice's balance of sol: ", balanceOfSol);

  const feePayerBalanceOfSol = await connection.getBalance(feePayer.publicKey);
  console.log("feePayer's balance of sol: ", feePayerBalanceOfSol);
}

// npx tsx src/tokens/wrapped_sol.ts
// feePayer account:  CFmiHUmUShPFEodfbpKf5XGAWcN4esRWTnAV6jJBFTbY
// alice account:  5jffzan4RvaB9RBrooqN8N5ufAzuDp2sirwrK1PMThB2
// alice ATA account:  8ecShnRqfPvpw4BoYHj8VkpAo3vFZH3qPpYbBuAo7AcH
// alice ATA 2 account:  Gh7c65NNT2PNGHgZzyPAvkVDQSgxn3C3wDYFf1AoTrmR
// transfer(by token) already confirmed, txhash: 3qC8NeLDNHXF9vrpC37HFWrxfVVsrpCrzWoiP5KUqv2v6mvqvDUtrXgA2WrAm9PpcxxgG7tTjRxRmC77RhjDuZnt
// alice's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 265830 },
//   value: {
//     amount: '1000000000',
//     decimals: 9,
//     uiAmount: 1,
//     uiAmountString: '1'
//   }
// }
// alice's ata2 token balance:  {
//   context: { apiVersion: '2.1.21', slot: 265830 },
//   value: {
//     amount: '2000000000',
//     decimals: 9,
//     uiAmount: 2,
//     uiAmountString: '2'
//   }
// }
// aliceATA2's balance of sol:  2002039280
// alice's balance of sol:  5000000000
// feePayer's balance of sol:  6995901440

await transferBySol();
await transferByToken();
