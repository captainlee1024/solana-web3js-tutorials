import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import {
  approveChecked,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createApproveCheckedInstruction,
  createAssociatedTokenAccount,
  createTransferInstruction,
  getAccount,
  mintToChecked,
  revoke,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { createAndInitMint } from './create_token.js';

async function example() {
  const connection = getLocalNetConnection();
  // 接下来我们所有的操作都用这个账户付费，所以后面的其他账户就不需要空投了
  const feePayer = Keypair.generate();
  await airdropAndConfirm(connection, feePayer.publicKey);

  // token的mint, freeze owner
  const tokenMintOwner = Keypair.generate();
  // token mint account
  const tokenMintAccount = Keypair.generate();
  // 为 alice 创建 tokenMintAccount 的 ATA 账户，这个账户用来存alice的这个token的数量
  // 类比 eth erc20 中的 mapping(address, uint256) userBalance
  const alice = Keypair.generate();
  const bob = Keypair.generate();
  const charlie = Keypair.generate();
  console.log('===============================setup');
  console.log('feePayer: ', feePayer.publicKey.toBase58());
  console.log('tokenMintOwner: ', tokenMintOwner.publicKey.toBase58());
  console.log('tokenMintAccount: ', tokenMintAccount.publicKey.toBase58());
  console.log('alice: ', alice.publicKey.toBase58());
  console.log('bob: ', bob.publicKey.toBase58());
  console.log('charlie: ', charlie.publicKey.toBase58());
  console.log('===============================setup end');

  // 先创建tokenMintAccount
  console.log('token mint -> ', tokenMintAccount.publicKey.toBase58());
  const returnedTokenMintAccount = await createAndInitMint(
    connection,
    feePayer,
    tokenMintOwner.publicKey,
    tokenMintOwner.publicKey,
    8,
    tokenMintAccount,
    TOKEN_2022_PROGRAM_ID
  );
  console.log('returned token mint -> ', returnedTokenMintAccount.publicKey.toBase58());

  // 创建ATA
  // 创建 alice 的ATA
  console.log('===============================create ata');

  let ataAlice = await createAssociatedTokenAccount(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    alice.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`alice's ATA: ${ataAlice.toBase58()}`);

  let ataBob = await createAssociatedTokenAccount(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    bob.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`bob's ATA: ${ataBob.toBase58()}`);

  let ataCharlie = await createAssociatedTokenAccount(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    charlie.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`charlie's ATA: ${ataCharlie.toBase58()}`);

  // 查询 ATA 的账户余额
  const aliceTokenAmount = await connection.getTokenAccountBalance(ataAlice, 'confirmed');
  console.log("alice's ata token balance: ", aliceTokenAmount);
  // 查询 BOB 的账户余额
  const bobTokenAmount = await connection.getTokenAccountBalance(ataBob, 'confirmed');
  console.log("bob's ata token balance: ", bobTokenAmount);
  // 查询 Charlie 的账户余额
  const CharlieTokenAmount = await connection.getTokenAccountBalance(ataCharlie, 'confirmed');
  console.log("charlie's ata token balance: ", CharlieTokenAmount);

  console.log("===============================mint to alice's ata");

  // mint 代币
  let mintTxHash = await mintToChecked(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    ataAlice,
    tokenMintOwner,
    1e9,
    8, // 这个要和tokenMintAccount创建时一样
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`mint Tx already confirmed, tx hash: ${mintTxHash}`);

  // 查询 ATA 的账户余额
  const aliceTokenAmountAfterMint = await connection.getTokenAccountBalance(ataAlice, 'confirmed');
  console.log(" alice's ata token balance: ", aliceTokenAmountAfterMint);
  // 查询 ATA 的账户余额
  const bobTokenAmountAfterMint = await connection.getTokenAccountBalance(ataBob, 'confirmed');
  console.log("bob's ata token balance: ", bobTokenAmountAfterMint);
  // 查询 Charlie 的账户余额
  const CharlieTokenAmountAfterMint = await connection.getTokenAccountBalance(
    ataCharlie,
    'confirmed'
  );
  console.log("charlie's ata token balance: ", CharlieTokenAmountAfterMint);

  console.log("===============================alice's ata approve to charlie's ata");
  console.log('approve by built-in function: approveChecked');
  // 这里可以自己构建交易，也可以使用封装好的函数去approve
  // 1) built-int function: approveChecked
  const approveTxHash1 = await approveChecked(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    ataAlice,
    // ataCharlie, // 不使用 ata 账户
    charlie.publicKey, // 使用普通账户，后续需要这个账户对应的私钥签名
    alice,
    100,
    8,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`built-in approveChecked already confirm, txhash: ${approveTxHash1}`);

  console.log('approve by composing transaction');
  const approveTx = new Transaction().add(
    createApproveCheckedInstruction(
      ataAlice,
      tokenMintAccount.publicKey,
      // ataCharlie,
      charlie.publicKey, // 使用普通账户，代理
      alice.publicKey,
      200,
      8,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
  );
  // approveTx.feePayer = feePayer.publicKey;
  const approveTxhash2 = await sendAndConfirmTransaction(connection, approveTx, [feePayer, alice]);
  console.log(`composing approveChecked transaction already confirm, txhash: ${approveTxhash2}`);
  // 查询 Charlie 的账户余额
  const CharlieTokenAmountAfterApprove = await connection.getTokenAccountBalance(
    ataCharlie,
    'confirmed'
  );
  console.log("charlie's ata token balance: ", CharlieTokenAmountAfterApprove);

  // NOTE: approve是覆盖不是叠加，所以这里转账之后，代理 ammount还剩50
  console.log("===============================alice's ata transfer to bob's ata");
  // charlie 用alice的token转账给bob
  const transferTx = new Transaction().add(
    createTransferInstruction(
      ataAlice,
      ataBob,
      charlie.publicKey, // 使用 charlie 的地址作为 authority（因为已被授权）
      150,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
  );
  // alice 只有token没有sol, feePayer代付手续费
  transferTx.feePayer = feePayer.publicKey;

  // NOTE:
  const transferTxHash = await sendAndConfirmTransaction(connection, transferTx, [
    feePayer,
    charlie,
  ]);
  console.log('transfer tx already confirmed, tx hash: ', transferTxHash);

  // 查询 ATA 的账户余额
  const aliceTokenAmountAfterTransfer = await connection.getTokenAccountBalance(
    ataAlice,
    'confirmed'
  );
  console.log("alice's ata token balance: ", aliceTokenAmountAfterTransfer);
  // 查询 ATA 的账户余额
  const bobTokenAmountAfterTransfer = await connection.getTokenAccountBalance(ataBob, 'confirmed');
  console.log("bob's ata token balance: ", bobTokenAmountAfterTransfer);
  // 查询 Charlie 的账户余额
  const CharlieTokenAmountAfterTransfer = await connection.getTokenAccountBalance(
    ataCharlie,
    'confirmed'
  );
  console.log("charlie's ata token balance: ", CharlieTokenAmountAfterTransfer);

  // 查看一下账户信息
  let aliceAccountinfo = await getAccount(connection, ataAlice, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log("alice's ata account info after approve: ", aliceAccountinfo);
  console.log('NOTE: approve是覆盖不是叠加，所以这里转账之后，代理 ammount还剩50');

  // 撤销代理
  const revokeTxHash = await revoke(
    connection,
    feePayer,
    ataAlice,
    alice,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log('revoke approve tx already confirmed, txhash: ', revokeTxHash);

  let aliceAccountinfoAfterRevoke = await getAccount(
    connection,
    ataAlice,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log("alice's ata account info after revoke approve: ", aliceAccountinfoAfterRevoke);
}

await example();

// npx tsx src/tokens/delegate_token_accounts.ts
// ===============================setup
// feePayer:  4cD9X7Ay9JPggKDCrtdmo5FTWVDDNM4Z4A9nhnpyDmd6
// tokenMintOwner:  7s5XsPeJdwEXkrkKT31YDDUCfEaRFjwYvMDdafoC46YT
// tokenMintAccount:  s2RjudNez8wwfigvPM7rqhxGkUZWDRUFS3yEMLV5vef
// alice:  Bu7EsPR7HiyXfnQqg6Fy5BKMBQR2jNZogPmrekdCZPgt
// bob:  8kdCrZMpz8e4NVij6b3xpRSjnDehESNqc9Nepjs4isbf
// charlie:  GPskNF2oF6NSyVxYxSzmKhxnkWed7DjjWWs6wWrhkRVn
// ===============================setup end
// token mint ->  s2RjudNez8wwfigvPM7rqhxGkUZWDRUFS3yEMLV5vef
// Create Token Info:
// feePayer:  4cD9X7Ay9JPggKDCrtdmo5FTWVDDNM4Z4A9nhnpyDmd6
// token addr:  s2RjudNez8wwfigvPM7rqhxGkUZWDRUFS3yEMLV5vef
// token mint authority:  7s5XsPeJdwEXkrkKT31YDDUCfEaRFjwYvMDdafoC46YT
// token freeze authority:  7s5XsPeJdwEXkrkKT31YDDUCfEaRFjwYvMDdafoC46YT
// token decimals:  8
// program Id:  PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//   _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
// }
// Send transaction, waiting the tx [txhash:2xcKwKv7pzHiZPsY4X8ChaFybS1GfapZwtzPi3RkYFnDakQjpyAoPagrqEE8Z8RioE56DPxtEzRG8SvVaQGtiCKv] confirm
// tx already confirmed
// returned token mint ->  s2RjudNez8wwfigvPM7rqhxGkUZWDRUFS3yEMLV5vef
// ===============================create ata
// alice's ATA: DTg8sKBNPAi3kcqNdkZa8v75snpXvPxM5gmmzeJStDoo
// bob's ATA: AE7Fc9FFVK1qJYhS1iKMb6urKJAcvS8bPQopWwhdrXAe
// charlie's ATA: 13bgFBgkAEkNDkqncXrGnwwhpaqidK8RudWpd4YzDyJb
// alice's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227800 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// bob's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227800 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// charlie's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227800 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// ===============================mint to alice's ata
// mint Tx already confirmed, tx hash: 2YWLVyjgx9L8EmNzp5nyCYWCHcpyKipFBKsvSJy42526e23fy5C1bSF5PiKM2yYkv9PALHT4wrmmBBiqqwnAq54R
//  alice's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227801 },
//   value: {
//     amount: '1000000000',
//     decimals: 8,
//     uiAmount: 10,
//     uiAmountString: '10'
//   }
// }
// bob's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227801 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// charlie's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227801 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// ===============================alice's ata approve to charlie's ata
// approve by built-in function: approveChecked
// built-in approveChecked already confirm, txhash: 2ki8JDXb9NhhLc2xS3bEnf8rjcKwx32Zn1gz8EY9JZxTsBrLczY8KoAPyJpjCdhpNx9PJhjpFaQ79iMC9poyaUmP
// approve by composing transaction
// composing approveChecked transaction already confirm, txhash: eYToVUSs8hEMHMyNWkYh3dZcdjYjxwYPpbWniLVdWR1b8dS9ydHBh6bkwnCkYHzbEpG8ee54V5oqnoBe6sYg8qY
// charlie's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227803 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// ===============================alice's ata transfer to bob's ata
// transfer tx already confirmed, tx hash:  4A642rBKrpPxgm8vHqrr1PikYCxu1nWicF7N3ZFrkxw1gWMAM5EtRG1iwQnyHooeBVPmPrzBFK4Smx7tFg74p1P4
// alice's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227804 },
//   value: {
//     amount: '999999850',
//     decimals: 8,
//     uiAmount: 9.9999985,
//     uiAmountString: '9.9999985'
//   }
// }
// bob's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227804 },
//   value: {
//     amount: '150',
//     decimals: 8,
//     uiAmount: 0.0000015,
//     uiAmountString: '0.0000015'
//   }
// }
// charlie's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 227804 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// alice's ata account info after approve:  {
//   address: PublicKey [PublicKey(5aBmGA96wmtgqhrpUsFTVxcZcLStB9mv5CRMbiAQYDZV)] {
//     _bn: <BN: 43ef159564ff409061200a7274ef9192cf5837d1ab3b15cc325abc563c66a434>
//   },
//   mint: PublicKey [PublicKey(CEvrjGJbL3CY3vQ8kEMjVfpEvJc5fxtXZXgdx9KXLz4Y)] {
//     _bn: <BN: a70200e25f6d4bccf7ca869f2973449128ba0fe81fd23c1b4c9e2c6157b25169>
//   },
//   owner: PublicKey [PublicKey(9Zowkas2sKT9tMVTHEji8g7JZZ48cHuNwjapy6jBUQT3)] {
//     _bn: <BN: 7f452939f21950ec2a3de5595da8817283bfae271e853e55605963f04ee3217a>
//   },
//   amount: 999999850n,
//   delegate: PublicKey [PublicKey(E6U4RZQFYsyeTDGuQNJcFUpxXNBvZqnE8YtCeMPcWMEr)] {
//     _bn: <BN: c28e6e08fbb0dace39bda1e8a31a82aa2fe6c500deb2e7dc32d44ef045ef63eb>
//   },
//   delegatedAmount: 50n,
//   isInitialized: true,
//   isFrozen: false,
//   isNative: false,
//   rentExemptReserve: null,
//   closeAuthority: null,
//   tlvData: <Buffer 07 00 00 00>
// }
// NOTE: approve是覆盖不是叠加，所以这里转账之后，代理 ammount还剩50
// revoke approve tx already confirmed, txhash:  5FbXoGcGzfomYbLJrt8ifDGFnR7EZJ9AeCtQZUZyDojdTsGJJSMWLWqTHSRVRfuaH4mHPKaJ8hPeJxe7S15Sdx61
// alice's ata account info after revoke approve:  {
//   address: PublicKey [PublicKey(5aBmGA96wmtgqhrpUsFTVxcZcLStB9mv5CRMbiAQYDZV)] {
//     _bn: <BN: 43ef159564ff409061200a7274ef9192cf5837d1ab3b15cc325abc563c66a434>
//   },
//   mint: PublicKey [PublicKey(CEvrjGJbL3CY3vQ8kEMjVfpEvJc5fxtXZXgdx9KXLz4Y)] {
//     _bn: <BN: a70200e25f6d4bccf7ca869f2973449128ba0fe81fd23c1b4c9e2c6157b25169>
//   },
//   owner: PublicKey [PublicKey(9Zowkas2sKT9tMVTHEji8g7JZZ48cHuNwjapy6jBUQT3)] {
//     _bn: <BN: 7f452939f21950ec2a3de5595da8817283bfae271e853e55605963f04ee3217a>
//   },
//   amount: 999999850n,
//   delegate: null,
//   delegatedAmount: 0n,
//   isInitialized: true,
//   isFrozen: false,
//   isNative: false,
//   rentExemptReserve: null,
//   closeAuthority: null,
//   tlvData: <Buffer 07 00 00 00>
// }
