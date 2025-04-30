import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getLocalNetConnection } from "../transaction/utils.js";

const connection = getLocalNetConnection();
const wallet = new PublicKey("2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju");

const balance = await connection.getBalance(wallet);
console.log(`Balance: ${balance / LAMPORTS_PER_SOL}`);
