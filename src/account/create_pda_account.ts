import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';

import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';

// TODO: 使用PDA签名和删除PDA账户

(async () => {
  // your program id
  const programId = new PublicKey('64ej4U71nft84LuWfuaL3Br31iRf1s87tmtWC2r3weUh');

  // setup fee payer or load local account
  const connection = getLocalNetConnection();
  const feePayer = Keypair.generate();
  console.log(`fee payer: ${feePayer.publicKey.toBase58()}`);
  await airdropAndConfirm(connection, feePayer.publicKey);

  // setup pda
  let [pda, bump] = PublicKey.findProgramAddressSync([feePayer.publicKey.toBuffer()], programId);
  console.log(`bump: ${bump}, PDA's pubkey: ${pda.toBase58()}`);

  const data_size = 0;
  let tx = new Transaction().add(
    new TransactionInstruction({
      keys: [
        {
          /** An account's public key */
          pubkey: feePayer.publicKey,
          /** True if an instruction requires a transaction signature matching `pubkey` */
          isSigner: true,
          /** True if the `pubkey` can be loaded as a read-write account. */
          isWritable: true,
        },
        {
          pubkey: pda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.from(new Uint8Array([data_size, bump])),
      programId: programId,
    })
  );

  // 第一种方式, 不推荐，使用sendTransaction代替，需要VersionedTransaction
  // let tx_sig = await connection.sendTransaction(tx, [feePayer]);
  // const result = await connection.confirmTransaction(tx_sig);
  // console.log(`txhash: ${tx_sig}`);

  // 简洁一些的方式
  //
  // await sendAndConfirmTransaction(connection, tx, [feePayer]);

  // 使用VersionedTransaction的方式
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = feePayer.publicKey;
  let m = tx.compileMessage();
  let vtx = new VersionedTransaction(m);
  vtx.sign([feePayer]);

  const txSignature = await connection.sendTransaction(vtx);
  const blockhash = await connection.getLatestBlockhash();

  const result = await connection.confirmTransaction(
    {
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      signature: txSignature,
    },
    'confirmed'
  );
  console.log(`tx hash: ${txSignature}`);

  console.log(`confirm info: confirm as slot: ${result.context.slot} ${result.value}`);
})();
