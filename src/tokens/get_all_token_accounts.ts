import { Keypair } from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAccount,
  mintToChecked,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { createAndInitMint } from './create_token.js';
import { loadDefaultKeypairFromFile } from '../wallets/load_local_keypair.js';

async function getAllTokenAccountExample() {
  const connection = getLocalNetConnection();
  // 接下来我们所有的操作都用这个账户付费，所以后面的其他账户就不需要空投了
  const feePayer = Keypair.generate();
  await airdropAndConfirm(connection, feePayer.publicKey);

  // token的mint, freeze owner
  const tokenMintOwner = Keypair.generate();
  // token mint account
  const tokenMintAccount = Keypair.generate();
  // 为 localAccount 创建 tokenMintAccount 的 ATA 账户，这个账户用来存localaccount的这个token的数量
  // 类比 eth erc20 中的 mapping(address, uint256) userBalance
  const localAccount = await loadDefaultKeypairFromFile();
  console.log('feePayer: ', feePayer.publicKey.toBase58());
  console.log('tokenMintOwner: ', tokenMintOwner.publicKey.toBase58());
  console.log('tokenMintAccount: ', tokenMintAccount.publicKey.toBase58());
  console.log('localAccount: ', localAccount.publicKey.toBase58());

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
    localAccount.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`localAccount's ATA: ${ata.toBase58()}`);

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

  // 获取所有代币账户
  // 每执行一次, 本地默认账户持有的token就会多一种
  let response = await connection.getParsedTokenAccountsByOwner(localAccount.publicKey, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  response.value.forEach((accountInfo) => {
    console.log(`accountInfo: `, accountInfo);
    console.log(`pubkey: ${accountInfo.pubkey.toBase58()}`);
    console.log(`mint: ${accountInfo.account.data['parsed']['info']['mint']}`);
    console.log(`owner: ${accountInfo.account.data['parsed']['info']['owner']}`);
    console.log(
      `decimals: ${accountInfo.account.data['parsed']['info']['tokenAmount']['decimals']}`
    );
    console.log(`amount: ${accountInfo.account.data['parsed']['info']['tokenAmount']['amount']}`);
    console.log('====================');
  });
}
// getAllTokenAccount example
// accountInfo:  {
//   account: {
//     data: { parsed: [Object], program: 'spl-token-2022', space: 170 },
//     executable: false,
//     lamports: 2074080,
//     owner: PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//       _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
//     },
//     rentEpoch: 18446744073709552000,
//     space: 170
//   },
//   pubkey: PublicKey [PublicKey(47uDz4NzNeR1pzskB7mz6aGWFcaDjhWkpKwzXBCCumTk)] {
//     _bn: <BN: 2e57986811f496d0ceb2b36602c416d17545ea74dc54b139b62a30c7738e946f>
//   }
// }
// pubkey: 47uDz4NzNeR1pzskB7mz6aGWFcaDjhWkpKwzXBCCumTk
// mint: FkRhvXjRvCD5EuEsBwsbHL22qGm6MMdudCLQLAiJMLJV
// owner: 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// decimals: 8
// amount: 1000000000
// ====================
// accountInfo:  {
//   account: {
//     data: { parsed: [Object], program: 'spl-token-2022', space: 170 },
//     executable: false,
//     lamports: 2074080,
//     owner: PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//       _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
//     },
//     rentEpoch: 18446744073709552000,
//     space: 170
//   },
//   pubkey: PublicKey [PublicKey(7mJe659HbXomfkuEUebciYBxHsw6HkRYGunNqjyN8k38)] {
//     _bn: <BN: 647f9f44302e158533f8febdba2f3dca4795f8a4bb61f2cb0e3837130a3c376f>
//   }
// }
// pubkey: 7mJe659HbXomfkuEUebciYBxHsw6HkRYGunNqjyN8k38
// mint: Dksouz6oEPgtgzCnfjwhWnGxx2qQyKcyqVMzchDvHenN
// owner: 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// decimals: 8
// amount: 1000000000
// ====================
// accountInfo:  {
//   account: {
//     data: { parsed: [Object], program: 'spl-token-2022', space: 170 },
//     executable: false,
//     lamports: 2074080,
//     owner: PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//       _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
//     },
//     rentEpoch: 18446744073709552000,
//     space: 170
//   },
//   pubkey: PublicKey [PublicKey(7qF3uGDy1Mvm4JaPcCitvj8Krd4bDujKpRHNxDnfusuh)] {
//     _bn: <BN: 6581e3055938313e934ca33f19e338d5575cc8924933861160dd7ac86ed2e418>
//   }
// }
// pubkey: 7qF3uGDy1Mvm4JaPcCitvj8Krd4bDujKpRHNxDnfusuh
// mint: Fz6HRgi1tNfhtZUukF4ZQPmtXj6JBki7csvWEN2DeDKy
// owner: 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// decimals: 8
// amount: 1000000000
// ====================
// accountInfo:  {
//   account: {
//     data: { parsed: [Object], program: 'spl-token-2022', space: 170 },
//     executable: false,
//     lamports: 2074080,
//     owner: PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//       _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
//     },
//     rentEpoch: 18446744073709552000,
//     space: 170
//   },
//   pubkey: PublicKey [PublicKey(8nxkzRd4rpZ1scoxNcoibf1AQm28m37xtQt6LLxuiw2c)] {
//     _bn: <BN: 73c7fdbd8083be426442354ee569ffbb41a7db42001169361034dcee384dd83d>
//   }
// }
// pubkey: 8nxkzRd4rpZ1scoxNcoibf1AQm28m37xtQt6LLxuiw2c
// mint: 2qoc2qh29Ep52sDhweKpWhQyhhTWBXUKKzYomzSPxrWn
// owner: 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// decimals: 8
// amount: 1000000000
// ====================
// accountInfo:  {
//   account: {
//     data: { parsed: [Object], program: 'spl-token-2022', space: 170 },
//     executable: false,
//     lamports: 2074080,
//     owner: PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//       _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
//     },
//     rentEpoch: 18446744073709552000,
//     space: 170
//   },
//   pubkey: PublicKey [PublicKey(C4LuZt4XmeoDxQMma92raGeVccPgACWUBa31QQLLW72E)] {
//     _bn: <BN: a44bce8894cc6d3589b8c024c4cc9b0f59005cc3790c98e895049065d845f1f7>
//   }
// }
// pubkey: C4LuZt4XmeoDxQMma92raGeVccPgACWUBa31QQLLW72E
// mint: q9NxkNnUk5cHRvvFMA59M9V8cdorzYxsF3VVsPWRoJt
// owner: 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// decimals: 8
// amount: 1000000000
// ====================
// accountInfo:  {
//   account: {
//     data: { parsed: [Object], program: 'spl-token-2022', space: 170 },
//     executable: false,
//     lamports: 2074080,
//     owner: PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//       _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
//     },
//     rentEpoch: 18446744073709552000,
//     space: 170
//   },
//   pubkey: PublicKey [PublicKey(G6DgfxqQXZxQQ1uZTLeGAokN3dyWvTjetJPH8MX4rwry)] {
//     _bn: <BN: e0358cbe6d94150f649a907301f5c219102a738ba268f606af3017258777a102>
//   }
// }
// pubkey: G6DgfxqQXZxQQ1uZTLeGAokN3dyWvTjetJPH8MX4rwry
// mint: 6qffy2GKBLcE19VDwABFVNKb7d8FG3CwqVALvFpaLJu2
// owner: 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// decimals: 8
// amount: 1000000000
// ====================
// accountInfo:  {
//   account: {
//     data: { parsed: [Object], program: 'spl-token-2022', space: 170 },
//     executable: false,
//     lamports: 2074080,
//     owner: PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//       _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
//     },
//     rentEpoch: 18446744073709552000,
//     space: 170
//   },
//   pubkey: PublicKey [PublicKey(GfLRoktUCjyF4BY7pw47reBZ9Uf6vFCPzcGRimi1GTiv)] {
//     _bn: <BN: e8b1577336d6a5f516683d3de33ba8253219f1a13261a274d731af5d03fb519f>
//   }
// }
// pubkey: GfLRoktUCjyF4BY7pw47reBZ9Uf6vFCPzcGRimi1GTiv
// mint: 816o3scoiygbr4qDNnW7xfCZbznCwNWK7HSEKtmx7CLW
// owner: 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// decimals: 8
// amount: 1000000000
// ====================

async function filterByMint() {
  const connection = getLocalNetConnection();
  // 接下来我们所有的操作都用这个账户付费，所以后面的其他账户就不需要空投了
  const feePayer = Keypair.generate();
  await airdropAndConfirm(connection, feePayer.publicKey);

  // token的mint, freeze owner
  const tokenMintOwner = Keypair.generate();
  // token mint account
  const tokenMintAccount = Keypair.generate();
  // 为 localAccount 创建 tokenMintAccount 的 ATA 账户，这个账户用来存localaccount的这个token的数量
  // 类比 eth erc20 中的 mapping(address, uint256) userBalance
  const localAccount = await loadDefaultKeypairFromFile();
  console.log('feePayer: ', feePayer.publicKey.toBase58());
  console.log('tokenMintOwner: ', tokenMintOwner.publicKey.toBase58());
  console.log('tokenMintAccount: ', tokenMintAccount.publicKey.toBase58());
  console.log('localAccount: ', localAccount.publicKey.toBase58());

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
    localAccount.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`localAccount's ATA: ${ata.toBase58()}`);

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

  // 获取所有代币账户
  // 每执行一次, 本地默认账户持有的token就会多一种
  let response = await connection.getParsedTokenAccountsByOwner(localAccount.publicKey, {
    mint: tokenMintAccount.publicKey,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  response.value.forEach((accountInfo) => {
    console.log(`accountInfo: `, accountInfo);
    console.log(`pubkey: ${accountInfo.pubkey.toBase58()}`);
    console.log(`mint: ${accountInfo.account.data['parsed']['info']['mint']}`);
    console.log(`owner: ${accountInfo.account.data['parsed']['info']['owner']}`);
    console.log(
      `decimals: ${accountInfo.account.data['parsed']['info']['tokenAmount']['decimals']}`
    );
    console.log(`amount: ${accountInfo.account.data['parsed']['info']['tokenAmount']['amount']}`);
    console.log('====================');
  });
}

// filterByMint example:
// npx tsx src/tokens/get_all_token_accounts.ts
// 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// feePayer:  H9pVroDnnCK7zX7knsY7Bmsq9ZETau2Zb6k6HV5W2JD2
// tokenMintOwner:  61JWeWr5EMJ9gnfKRcnuynLBjek11wuShw7AkUH722Ab
// tokenMintAccount:  GrDXrArrXtpWNPXKScufp3bxpx5JPoa6rMMpa6WKWMN9
// localAccount:  2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// token mint ->  GrDXrArrXtpWNPXKScufp3bxpx5JPoa6rMMpa6WKWMN9
// accountInfo:  {
//   account: {
//     data: { parsed: [Object], program: 'spl-token-2022', space: 170 },
//     executable: false,
//     lamports: 2074080,
//     owner: PublicKey [PublicKey(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)] {
//       _bn: <BN: 6ddf6e1ee758fde18425dbce46ccddab61afc4d83b90d27febdf928d8a18bfc>
//     },
//     rentEpoch: 18446744073709552000,
//     space: 170
//   },
//   pubkey: PublicKey [PublicKey(D7r9hyFj7vAXHY8mKaW4qbXpVfevSDmJ8ZkEFNUjZfeK)] {
//     _bn: <BN: b40d4d5b7bd38cc1057514493fd5b110b7df0209641113b868828161b45c168c>
//   }
// }
// pubkey: D7r9hyFj7vAXHY8mKaW4qbXpVfevSDmJ8ZkEFNUjZfeK
// mint: GrDXrArrXtpWNPXKScufp3bxpx5JPoa6rMMpa6WKWMN9
// owner: 2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju
// decimals: 8
// amount: 1000000000
// ====================

await getAllTokenAccountExample();
await filterByMint();
