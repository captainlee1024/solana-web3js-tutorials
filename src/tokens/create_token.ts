// 创建代币是通过铸币账户来完成的, 该铸币账户随后将代币铸入用户的关联代币账户:ATA
// 1. create connection
// 2. generate feePayer 类似eth中部署token合约的时的sender, 需要付gas fee
// 3. generate mint author 类似eth中的token的woker, solana可以设置mint和freeze的 owner
// 4. create mint pk 可以使用封装好的函数，会创建出一个mint的addr,然后发送交易，创建合约和初始化mint account(使用创建好的mint addr)
//	a) use build-in function createMint
//	b) compose by yourself, 这里是自己创建mint addr,组装交易发送
//		- create mint keypair
//		- construct tx create mint account and mint account
//		- send transaction

import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import {
  createInitializeMintInstruction,
  createMint,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

export async function createAndInitMint(
  connection: Connection,
  feePayer: Signer,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null,
  decimals: number,
  tokenMintAccount = Keypair.generate(),
  programId = TOKEN_PROGRAM_ID
): Promise<Keypair> {
  const tx = new Transaction().add(
    // create mint account
    SystemProgram.createAccount({
      /** The account that will transfer lamports to the created account */
      fromPubkey: feePayer.publicKey,
      /** Public key of the created account */
      newAccountPubkey: tokenMintAccount.publicKey,
      /** Amount of lamports to transfer to the created account */
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      /** Amount of space in bytes to allocate to the created account */
      space: MINT_SIZE,
      /** Public key of the program to assign as the owner of the created account */
      programId: programId, // 注意这里的programId
    }),
    // init mint account
    createInitializeMintInstruction(
      tokenMintAccount.publicKey,
      8,
      mintAuthority,
      mintAuthority,
      programId //注意和createAccount保持一直
    )
  );

  console.log('Create Token Info:');
  console.log('feePayer: ', feePayer.publicKey.toBase58());
  console.log('token addr: ', tokenMintAccount.publicKey.toBase58());
  console.log('token mint authority: ', mintAuthority.toBase58());
  console.log('token freeze authority: ', freezeAuthority?.toBase58());
  console.log('token decimals: ', decimals);
  console.log('program Id: ', programId);

  const blockhash = await connection.getLatestBlockhash();

  // 这种方式更简洁，但是我们手动
  // const txSignature = await sendAndConfirmTransaction(connection, transaction, [feePayer, mint]);
  // 使用VersionedTransaction的方式
  tx.recentBlockhash = blockhash.blockhash;
  tx.feePayer = feePayer.publicKey;
  let m = tx.compileMessage();
  let vtx = new VersionedTransaction(m);
  // 这里需要feePayer和tokenMintAccount账户同时签名
  vtx.sign([feePayer, tokenMintAccount]);
  const txhash = await connection.sendTransaction(vtx);
  console.log(`Send transaction, waiting the tx [txhash:${txhash}] confirm`);

  await connection.confirmTransaction(
    {
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      signature: txhash,
    },
    'confirmed'
  );
  console.log(`tx already confirmed`);

  return tokenMintAccount;
}

async function example() {
  const connection = getLocalNetConnection();
  const feePayer = Keypair.generate();
  await airdropAndConfirm(connection, feePayer.publicKey);
  const mintOwner = Keypair.generate();

  // use built-in function
  let mintPubkey = await createMint(
    connection,
    feePayer, // feePayer
    mintOwner.publicKey, // mint authority
    mintOwner.publicKey, // freezeAuthority, use `null` to disable
    8 // decimals
  );
  console.log(`mint: ${mintPubkey.toBase58()}`);

  // compose by yourself
  // 上面的代码等价于下面的代码
  // mint 在createMint里面创建了，返回了publickey
  const tokenMintAccount = Keypair.generate();
  console.log(`mint: ${tokenMintAccount.publicKey.toBase58()}`);
  await createAndInitMint(
    connection,
    feePayer,
    mintOwner.publicKey,
    mintOwner.publicKey,
    8,
    tokenMintAccount,
    TOKEN_PROGRAM_ID
  );
}

// 去掉注释执行example
// example();
