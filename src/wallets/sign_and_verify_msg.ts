import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

const keypair = Keypair.generate();
const msg = "hello!";
const msgBytes = naclUtil.decodeUTF8(msg);

const signature = nacl.sign.detached(msgBytes, keypair.secretKey);
console.log(`signature: ${signature}`);

const result = nacl.sign.detached.verify(msgBytes, signature, keypair.publicKey.toBytes());

console.log("verify result: ", result);
