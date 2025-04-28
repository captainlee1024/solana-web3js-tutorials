import { Keypair } from "@solana/web3.js";

const keypair = Keypair.generate();
console.log("generate a keypair:");
console.log(`publickey: ${keypair.publicKey}, address: ${keypair.publicKey.toBase58()}`);
