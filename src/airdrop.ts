import {
	Connection,
	Keypair,
	LAMPORTS_PER_SOL,
	sendAndConfirmTransaction,
	SystemProgram,
	Transaction,
} from "@solana/web3.js";

const aliceKeypair = Keypair.generate();
const bobKeypair = Keypair.generate();

const connection = new Connection("http://127.0.0.1:8899", "confirmed");

const printBalances = async () => {
	console.log(
		"alice balance:",
		(await connection.getBalance(aliceKeypair.publicKey)) / LAMPORTS_PER_SOL,
		"SOL",
	);
	console.log(
		"bob balance:",
		(await connection.getBalance(bobKeypair.publicKey)) / LAMPORTS_PER_SOL,
		"SOL",
	);
};

console.log("start");
await printBalances();

const airdropSignature = await connection.requestAirdrop(aliceKeypair.publicKey, LAMPORTS_PER_SOL);

console.log("alice aridrop");
await printBalances();

await connection.confirmTransaction(airdropSignature);
// TODD: fixme
// await connection.confirmTransaction(strategy);

const lamportsToSend = 1_000_000;

const transferTransaction = new Transaction().add(
	SystemProgram.transfer({
		fromPubkey: aliceKeypair.publicKey,
		toPubkey: bobKeypair.publicKey,
		lamports: lamportsToSend,
	}),
);

await sendAndConfirmTransaction(connection, transferTransaction, [aliceKeypair]);

console.log("alice transfer to bob");
await printBalances();
