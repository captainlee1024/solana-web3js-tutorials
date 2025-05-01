import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  closeAccount,
  getAccount,
  getOrCreateAssociatedTokenAccount,
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
  console.log('feePayer: ', feePayer.publicKey.toBase58());
  console.log('tokenMintOwner: ', tokenMintOwner.publicKey.toBase58());
  console.log('tokenMintAccount: ', tokenMintAccount.publicKey.toBase58());
  console.log('alice: ', alice.publicKey.toBase58());

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
  // getOrCreateAssociatedTokenAccount也可以用于创建
  // let ata = await createAssociatedTokenAccount(
  let ataAccountInfo = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    alice.publicKey,
    undefined,
    'confirmed',
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`alice's ATA: ${ataAccountInfo.address.toBase58()}`);

  // 查询ATA账户信息
  let ataAccountInfoFromChain = await getAccount(
    connection,
    ataAccountInfo.address,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('ata account info: ', ataAccountInfoFromChain);

  // 查询 ATA 的账户余额
  const tokenAmount = await connection.getTokenAccountBalance(ataAccountInfo.address, 'confirmed');
  console.log('ata token balance: ', tokenAmount);

  // 关闭 ata account
  const txhash = await closeAccount(
    connection,
    feePayer,
    ataAccountInfo.address,
    alice.publicKey,
    alice,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`close ata tx already confirmed, tx hash: ${txhash}`);

  console.log(
    `rent refund to alice, alice balance: ${(await connection.getBalance(alice.publicKey)) / LAMPORTS_PER_SOL} SOL`
  );

  try {
    let ataAccountInfoFromChainAfterClose = await getAccount(
      connection,
      ataAccountInfo.address,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    );
    console.log('ata account info: ', ataAccountInfoFromChainAfterClose);
  } catch (e) {
    console.log('get ata account info failed, err: ', (e as Error).name);
  }
}

await example();
