import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";

export function genMnemonic(): string {
	const mnemonic = bip39.generateMnemonic();
	console.log("mnemonic: ", mnemonic);
	return mnemonic;
}

export function restoreKeypairFromMne(mne: string): Keypair {
	const seed = bip39.mnemonicToSeedSync(mne, "");
	const keypair = Keypair.fromSeed(seed.slice(0, 32));

	console.log(`publickey: ${keypair.publicKey.toBase58()}`);
	return keypair;
}

const mne = genMnemonic();
const keypair = restoreKeypairFromMne(mne);
console.log(keypair.publicKey.toBase58());
// mnemonic:  exhibit gym cigar laugh sand faint load dad spider turkey author reveal
// publickey: 2vkEQ74PikuUcKgiaw2hjc5nPa48zj19c6PCfehK1SgV
// 2vkEQ74PikuUcKgiaw2hjc5nPa48zj19c6PCfehK1SgV
