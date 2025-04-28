import { PublicKey } from "@solana/web3.js";
import { loadDefaultKeypairFromFile } from "./restore_a_keypair.js";

const publickey = new PublicKey("2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju");

const keypair = await loadDefaultKeypairFromFile();

console.log(keypair.publicKey.toBase58() === publickey.toBase58());
