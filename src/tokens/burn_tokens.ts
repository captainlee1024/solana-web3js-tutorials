import { Keypair } from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  burnChecked,
  createAssociatedTokenAccount,
  getAccount,
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

  // ata 是这样算出来的，所以这里的ProgramId一定要和 创建TokenMintAccount的ProgramId一样
  // const [address] = PublicKey.findProgramAddressSync(
  //     [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
  //     associatedTokenProgramId,
  // );
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

  // 查询 ATA 的账户余额
  const tokenAmount = await connection.getTokenAccountBalance(ata, 'confirmed');
  console.log('ata token balance: ', tokenAmount);

  // mint 代币
  let mintTxHash = await mintToChecked(
    connection,
    feePayer,
    tokenMintAccount.publicKey,
    ata,
    tokenMintOwner,
    1e9,
    8, // 这个要和tokenMintAccount创建时一样
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`mint Tx already confirmed, tx hash: ${mintTxHash}`);

  // 再次查看账户信息和账户余额
  let ataAccountInfoAfterMint = await getAccount(
    connection,
    ata,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('ata account info: ', ataAccountInfoAfterMint);

  // 查询 ATA 的账户余额
  const tokenAmountAfterMint = await connection.getTokenAccountBalance(ata, 'confirmed');
  console.log('ata token balance: ', tokenAmountAfterMint);

  // burn 代币
  const amountToburn = 1;
  console.log('burning 1 token');
  const burnTx = await burnChecked(
    connection,
    feePayer,
    ata,
    tokenMintAccount.publicKey,
    alice,
    amountToburn,
    8,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`brun tx already confirmed, txhash ${burnTx}`);
  // 再次查看代币余额
  const tokenAmountAfterBrun = await connection.getTokenAccountBalance(ata, 'confirmed');
  console.log('ata token balance: ', tokenAmountAfterBrun);
}

await example();
