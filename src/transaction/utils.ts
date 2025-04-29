import {
	Connection,
	LAMPORTS_PER_SOL,
	PublicKey,
	RpcResponseAndContext,
	SignatureResult,
} from "@solana/web3.js";

export function getLocalNetConnection(): Connection {
	const connection = new Connection("http://127.0.0.1:8899", "confirmed");
	return connection;
}

export async function airdropAndConfirm(
	connection: Connection,
	pk: PublicKey,
	lamports: number = LAMPORTS_PER_SOL,
): Promise<RpcResponseAndContext<SignatureResult>> {
	// airdrop for pk
	const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
	const airdropSignature = await connection.requestAirdrop(pk, lamports);

	// wait confirm
	return connection.confirmTransaction({
		blockhash,
		lastValidBlockHeight,
		signature: airdropSignature,
	});
}
