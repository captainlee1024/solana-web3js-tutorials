import { Cluster, clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { loadDefaultKeypairFromFile } from "./load_local_keypair.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import { fetchWithProxy } from "./proxy_fetch.js";

export async function loadDefaultKeypairWithAirdrop(cluster: Cluster): Promise<Keypair> {
	const keypair = await loadDefaultKeypairFromFile();

	const proxyUrl = "http://127.0.0.1:7897";
	const proxyAgent = new HttpsProxyAgent(proxyUrl);

	const rpcUrl = clusterApiUrl(cluster);
	// 根据RPC URL决定使用哪种代理
	const isHttps = rpcUrl.startsWith("https");
	console.log(`rpcUrl: ${rpcUrl}`);
	const connection = new Connection(rpcUrl, {
		// commitment: "confirmed",
		// fetch: fetch as any, // 使用 node-fetch
		// httpAgent: httpsAgent, // 设置代理
		commitment: "confirmed",

		fetch: fetchWithProxy as any,
	});

	try {
		const balance = await connection.getBalance(keypair.publicKey);

		// 1 LAMPORTS_PER_SOL = 1 SOL
		console.log(`Balance: ${balance} lamports`);

		console.log("airdrop 1_000_000 lamports");
		await connection.requestAirdrop(keypair.publicKey, 1_000_000);
		console.log(`Balance: ${balance} lamports`);
	} catch (err) {
		console.error("Error fetching balance: ", err);
	}

	return keypair;
}

const keypair = await loadDefaultKeypairWithAirdrop("devnet");
console.log(keypair.publicKey.toBase58());
