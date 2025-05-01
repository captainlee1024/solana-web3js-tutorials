import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createTransferInstruction,
  mintToChecked,
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
  console.log('===============================setup');
  console.log('feePayer: ', feePayer.publicKey.toBase58());
  console.log('tokenMintOwner: ', tokenMintOwner.publicKey.toBase58());
  console.log('tokenMintAccount: ', tokenMintAccount.publicKey.toBase58());
  console.log('alice: ', alice.publicKey.toBase58());
  console.log('bob: ', bob.publicKey.toBase58());
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

  // 查询 ATA 的账户余额
  const aliceTokenAmount = await connection.getTokenAccountBalance(ataAlice, 'confirmed');
  console.log("alice's ata token balance: ", aliceTokenAmount);
  // 查询 ATA 的账户余额
  const bobTokenAmount = await connection.getTokenAccountBalance(ataBob, 'confirmed');
  console.log("bob's ata token balance: ", bobTokenAmount);

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

  console.log("===============================alice's ata transfer to bob's ata");
  const transferTx = new Transaction().add(
    createTransferInstruction(
      ataAlice,
      ataBob,
      alice.publicKey,
      100,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
  );
  // alice 只有token没有sol, feePayer代付手续费
  transferTx.feePayer = feePayer.publicKey;

  // NOTE:
  const transferTxHash = await sendAndConfirmTransaction(connection, transferTx, [feePayer, alice]);
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
}

await example();

// npx tsx src/tokens/transfer_token.ts
//
// output
// ===============================setup
// feePayer:  7XsJzAc4Yfc8Ngsdbfxfs9m6BW6bGkzqYAh6QSLfDKjy
// tokenMintOwner:  FXRVTTyjP8tXM18mpy94ADNUzn3dgrmgMdZrS6ZBL4CZ
// tokenMintAccount:  9Yy29eLk52U9GnW8uYqKpSbt5tjvm84FGHNyTNUGHQLo
// alice:  4bazw4PmcvwRWsVLAT1MLvP3Gx2KXmwthHdHb4611ecf
// bob:  AC8fJX16pJ8YixyeGzxGzn2fZRGCS6jtnb2qM4mDNyR8
// ===============================setup end
// token mint ->  9Yy29eLk52U9GnW8uYqKpSbt5tjvm84FGHNyTNUGHQLo
// Create Token Info:
// feePayer:  7XsJzAc4Yfc8Ngsdbfxfs9m6BW6bGkzqYAh6QSLfDKjy
// token addr:  9Yy29eLk52U9GnW8uYqKpSbt5tjvm84FGHNyTNUGHQLo
// token mint authority:  FXRVTTyjP8tXM18mpy94ADNUzn3dgrmgMdZrS6ZBL4CZ
// token freeze authority:  FXRVTTyjP8tXM18mpy94ADNUzn3dgrmgMdZrS6ZBL4CZ
// token decimals:  8
// program Id:  PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//   _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
// }
// Send transaction, waiting the tx [txhash:3t7a6F53j1uhdNbc5pi1q1pbuv3sTcKZofzHvnYXJ1z1jXBaAsLYVyPB4SC4r845DKhmqA8S4oNhVsuNudQm7qnB] confirm
// tx already confirmed
// returned token mint ->  9Yy29eLk52U9GnW8uYqKpSbt5tjvm84FGHNyTNUGHQLo
// ===============================create ata
// alice's ATA: 3nb83a3SCJZLN9PLr2RpspwbTMQ9wxEK6bRaKpAG2xd6
// bob's ATA: HGxaiyPPmjpY1we6bqrGVcxvv865ZxXsDaCbbHWpCvFa
// alice's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 205920 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// bob's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 205920 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// ===============================mint to alice's ata
// mint Tx already confirmed, tx hash: 4523FibExchdoXRzZzUzVdBsVkkX98Tm4mE6WWT9MsShywR8hHGXo1pow5WHBEFoGHVLMWuP6XfVK3mMTRSa7ss5
//  alice's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 205921 },
//   value: {
//     amount: '1000000000',
//     decimals: 8,
//     uiAmount: 10,
//     uiAmountString: '10'
//   }
// }
// bob's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 205921 },
//   value: { amount: '0', decimals: 8, uiAmount: 0, uiAmountString: '0' }
// }
// ===============================alice's ata transfer to bob's ata
// transfer tx already confirmed, tx hash:  JnPVuwSU8VL2L2zFN25viXNBcWhYDBim2KsHhZ8Gmg4N8u9vJAQRgYKT2vctZ2dKvcg4ZhBNxb5dDg67hFkJ3Ma
// alice's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 205922 },
//   value: {
//     amount: '999999900',
//     decimals: 8,
//     uiAmount: 9.999999,
//     uiAmountString: '9.999999'
//   }
// }
// bob's ata token balance:  {
//   context: { apiVersion: '2.1.21', slot: 205922 },
//   value: {
//     amount: '100',
//     decimals: 8,
//     uiAmount: 0.000001,
//     uiAmountString: '0.000001'
//   }
// }
