import { Connection, Keypair } from "@solana/web3.js";
import { loadDefaultKeypairFromFile } from "./load_local_keypair.js";

export async function loadDefaultKeypairWithAirdropFromLocalNet(url: string): Promise<Keypair> {
	const keypair = await loadDefaultKeypairFromFile();

	const connection = new Connection(url, "confirmed");

	try {
		var balance = await connection.getBalance(keypair.publicKey);

		// 1 LAMPORTS_PER_SOL = 1 SOL
		console.log(`Balance: ${balance} lamports`);

		console.log("airdrop 1_000_000 lamports");
		let signature = await connection.requestAirdrop(keypair.publicKey, 1_000_000);

		const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

		// 等待交易被打包进最新块
		await connection.confirmTransaction({
			blockhash,
			lastValidBlockHeight,
			signature,
		});

		balance = await connection.getBalance(keypair.publicKey);
		console.log(`Balance: ${balance} lamports`);
	} catch (err) {
		console.error("Error fetching balance: ", err);
	}

	return keypair;
}

const keypair = await loadDefaultKeypairWithAirdropFromLocalNet("http://127.0.0.1:8899");
console.log(keypair.publicKey.toBase58());
