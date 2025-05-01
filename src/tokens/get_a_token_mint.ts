import { Keypair } from '@solana/web3.js';
import { airdropAndConfirm, getLocalNetConnection } from '../transaction/utils.js';
import { createAndInitMint } from './create_token.js';
import { getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const connection = getLocalNetConnection();
const feePayer = Keypair.generate();
await airdropAndConfirm(connection, feePayer.publicKey);

const mintOwner = Keypair.generate();

const tokenMint = await createAndInitMint(
  connection,
  feePayer,
  mintOwner.publicKey,
  mintOwner.publicKey,
  8
);

let tokenMintAccount = await getMint(
  connection,
  tokenMint.publicKey,
  'confirmed',
  TOKEN_PROGRAM_ID
);
console.log('token mint account: ', tokenMintAccount);
