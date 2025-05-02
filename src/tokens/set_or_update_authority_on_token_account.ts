// 可以 set/update authority
// 1. MintTokens (on token mint account, 给代币设置Mint的权限)
// 2. FreezeAccount (on token mint account, 给代币设置冻结的权限)
// 3. AccountOwner (on ata token account, 给 ata 设置所有者)
// 4. CloseAccount (on ata token account, 关闭 ata 账户)

import { Keypair } from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  createAssociatedTokenAccount,
  getAccount,
  getMint,
  setAuthority,
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
  const newMintOwner = Keypair.generate();
  const newFreezeOwner = Keypair.generate();
  console.log('feePayer: ', feePayer.publicKey.toBase58());
  console.log('tokenMintOwner: ', tokenMintOwner.publicKey.toBase58());
  console.log('tokenMintAccount: ', tokenMintAccount.publicKey.toBase58());
  console.log('alice: ', alice.publicKey.toBase58());
  console.log('newMintOwner: ', newMintOwner.publicKey.toBase58());
  console.log('newFreezeOwner: ', newFreezeOwner.publicKey.toBase58());

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
  let tokenMintAccountInfo = await getMint(
    connection,
    tokenMintAccount.publicKey,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('token mint account: ', tokenMintAccountInfo);

  // 创建ATA
  let ata = await createAssociatedTokenAccount(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    alice.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`alice's ATA: ${ata.toBase58()}`);

  // 查询ATA账户信息
  let ataAccountInfo = await getAccount(connection, ata, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log('ata account info: ', ataAccountInfo);

  console.log(
    '======================================change token mint authority (AuthorityType.MintTokens)'
  );

  const mintAuthTx = await setAuthority(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    tokenMintOwner,
    AuthorityType.MintTokens,
    newMintOwner.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log('update token mint auth tx already confirmed, txhash: ', mintAuthTx);
  let tokenMintAccountInfoAfterUpdateMintAuth = await getMint(
    connection,
    tokenMintAccount.publicKey,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('token mint account: ', tokenMintAccountInfoAfterUpdateMintAuth);

  console.log(
    '======================================change token freeze authority (AuthorityType.FreezeAccount)'
  );

  const freezeAuthTx = await setAuthority(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    tokenMintOwner, // 签名的一定是当前操作权限的拥有者, 之后再变更就要用newFreezeOwner去签名做这个变更
    AuthorityType.FreezeAccount,
    newFreezeOwner.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log('update token freeze auth tx already confirmed, txhash: ', freezeAuthTx);
  let tokenMintAccountInfoAfterUpdateFreezeAuth = await getMint(
    connection,
    tokenMintAccount.publicKey,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('token mint account: ', tokenMintAccountInfoAfterUpdateFreezeAuth);
}

await example();

// npx tsx src/tokens/set_or_update_authority_on_token_account.ts
// feePayer:  Cyx4fWFqXxwiqnw5QzMPEbRzk8AAgWjSxJv58y1JrY67
// tokenMintOwner:  HYFDN7Up84ioWZ3D1cshYzLur1KSAZ2gp5tcXqM3btwh
// tokenMintAccount:  G4CuzAB5RRy7ea1zfRZyw1p7voNjtL7nvkN4sz4GU82C
// alice:  C4ndjZPietefjwj5EBpexAuFNAxDfpzvNuDDsuzRTX2o
// newMintOwner:  GgR4C4y4eL7hHLZZcH8nJNXdF6YrhwEddDDtgQmMoNBu
// newFreezeOwner:  EL36kJN7pJTLQ9bgWFVxTyqEkzSJDwcStnEXzNYUHBqD
// token mint ->  G4CuzAB5RRy7ea1zfRZyw1p7voNjtL7nvkN4sz4GU82C
// Create Token Info:
// feePayer:  Cyx4fWFqXxwiqnw5QzMPEbRzk8AAgWjSxJv58y1JrY67
// token addr:  G4CuzAB5RRy7ea1zfRZyw1p7voNjtL7nvkN4sz4GU82C
// token mint authority:  HYFDN7Up84ioWZ3D1cshYzLur1KSAZ2gp5tcXqM3btwh
// token freeze authority:  HYFDN7Up84ioWZ3D1cshYzLur1KSAZ2gp5tcXqM3btwh
// token decimals:  8
// program Id:  PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//   _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
// }
// Send transaction, waiting the tx [txhash:2xaGsYdojGTTZqYoZSsNTL8bGdtE9LdG1zQhriRK1bzTTuHt5pPsYxruBgNxoW13uGoJpSJdPUyUi594r6hoezRg] confirm
// tx already confirmed
// returned token mint ->  G4CuzAB5RRy7ea1zfRZyw1p7voNjtL7nvkN4sz4GU82C
// token mint account:  {
//   address: PublicKey [PublicKey(G4CuzAB5RRy7ea1zfRZyw1p7voNjtL7nvkN4sz4GU82C)] {
//     _bn: <BN: dfb1845aa8fc4b82f14b26757cf314adf0c655c47258f6a27fa64f06cdfbdd89>
//   },
//   mintAuthority: PublicKey [PublicKey(HYFDN7Up84ioWZ3D1cshYzLur1KSAZ2gp5tcXqM3btwh)] {
//     _bn: <BN: f5bc11190740322ae4395bcaf64ac5a32bd8833b12bbbacc9a9714ab24185e80>
//   },
//   supply: 0n,
//   decimals: 8,
//   isInitialized: true,
//   freezeAuthority: PublicKey [PublicKey(HYFDN7Up84ioWZ3D1cshYzLur1KSAZ2gp5tcXqM3btwh)] {
//     _bn: <BN: f5bc11190740322ae4395bcaf64ac5a32bd8833b12bbbacc9a9714ab24185e80>
//   },
//   tlvData: <Buffer >
// }
// alice's ATA: GcwFNUit74QBxhq8oLKkM6QXaKVrbqzszhpS8jXuN1X1
// ata account info:  {
//   address: PublicKey [PublicKey(GcwFNUit74QBxhq8oLKkM6QXaKVrbqzszhpS8jXuN1X1)] {
//     _bn: <BN: e813f86932545a57bb07f3e6b7e344e728a24a81770898a92930fad94bc65314>
//   },
//   mint: PublicKey [PublicKey(G4CuzAB5RRy7ea1zfRZyw1p7voNjtL7nvkN4sz4GU82C)] {
//     _bn: <BN: dfb1845aa8fc4b82f14b26757cf314adf0c655c47258f6a27fa64f06cdfbdd89>
//   },
//   owner: PublicKey [PublicKey(C4ndjZPietefjwj5EBpexAuFNAxDfpzvNuDDsuzRTX2o)] {
//     _bn: <BN: a468e57a793ee064247552df2d43980ea907e3bd2b92ff736c9071b2efc5bad0>
//   },
//   amount: 0n,
//   delegate: null,
//   delegatedAmount: 0n,
//   isInitialized: true,
//   isFrozen: false,
//   isNative: false,
//   rentExemptReserve: null,
//   closeAuthority: null,
//   tlvData: <Buffer 07 00 00 00>
// }
// ======================================change token mint authority (AuthorityType.MintTokens)
// update token mint auth tx already confirmed, txhash:  2ZEvwbVqAbmFiKKoFUyQDc5B366DPBKvMHjSDWoLvGVorMeEn7sAdkRDzeA8CmDy1aeVjiLRfDrf36wJFzJhiULb
// token mint account:  {
//   address: PublicKey [PublicKey(G4CuzAB5RRy7ea1zfRZyw1p7voNjtL7nvkN4sz4GU82C)] {
//     _bn: <BN: dfb1845aa8fc4b82f14b26757cf314adf0c655c47258f6a27fa64f06cdfbdd89>
//   },
//   mintAuthority: PublicKey [PublicKey(GgR4C4y4eL7hHLZZcH8nJNXdF6YrhwEddDDtgQmMoNBu)] {
//     _bn: <BN: e8f8278ffa85141acc32e8d0c6857d1c1759c8a16a6aee3194d0d134eccd2a9c>
//   },
//   supply: 0n,
//   decimals: 8,
//   isInitialized: true,
//   freezeAuthority: PublicKey [PublicKey(HYFDN7Up84ioWZ3D1cshYzLur1KSAZ2gp5tcXqM3btwh)] {
//     _bn: <BN: f5bc11190740322ae4395bcaf64ac5a32bd8833b12bbbacc9a9714ab24185e80>
//   },
//   tlvData: <Buffer >
// }
// ======================================change token freeze authority (AuthorityType.FreezeAccount)
// update token freeze auth tx already confirmed, txhash:  GNPrQoZ7qHnSsLi5ZRat4mabavAGcVnPnuNBQcKEmoeSGpvzFxVKNkdsSb8shvLhsoHA7BpJx6DojcZnL3nAnXi
// token mint account:  {
//   address: PublicKey [PublicKey(G4CuzAB5RRy7ea1zfRZyw1p7voNjtL7nvkN4sz4GU82C)] {
//     _bn: <BN: dfb1845aa8fc4b82f14b26757cf314adf0c655c47258f6a27fa64f06cdfbdd89>
//   },
//   mintAuthority: PublicKey [PublicKey(GgR4C4y4eL7hHLZZcH8nJNXdF6YrhwEddDDtgQmMoNBu)] {
//     _bn: <BN: e8f8278ffa85141acc32e8d0c6857d1c1759c8a16a6aee3194d0d134eccd2a9c>
//   },
//   supply: 0n,
//   decimals: 8,
//   isInitialized: true,
//   freezeAuthority: PublicKey [PublicKey(EL36kJN7pJTLQ9bgWFVxTyqEkzSJDwcStnEXzNYUHBqD)] {
//     _bn: <BN: c60856bee65b8b26d0e35645d995ff4afa084091cbf175679a64985b9afed5a4>
//   },
//   tlvData: <Buffer >
// }
