import {
	Connection,
	Keypair,
	Transaction,
	SystemProgram,
	LAMPORTS_PER_SOL,
	Message,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { airdropAndConfirm } from "./utils.js";

// To complete an offline transaction, I will separate them into four steps
// 1. Create Transaction // 2. Sign Transaction // 3. Recover Transaction // 4.Send Transaction

async function offlineTx() {
	// create connection
	const connection = new Connection("http://127.0.0.1:8899", "confirmed");

	// create an example tx, alice transfer to bob and feePayer is `feePayer`
	// alice and feePayer are signer in this tx const feePayer = Keypair.generate();
	const feePayer = Keypair.generate();
	await airdropAndConfirm(connection, feePayer.publicKey);

	const alice = Keypair.generate();
	await airdropAndConfirm(connection, alice.publicKey);

	const bob = Keypair.generate();

	// 1. Create Transaction
	let tx = new Transaction().add(
		SystemProgram.transfer({
			fromPubkey: alice.publicKey,
			toPubkey: bob.publicKey,
			lamports: 0.1 * LAMPORTS_PER_SOL,
		}),
	);
	// tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
	tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
	tx.feePayer = feePayer.publicKey;

	let realDataNeedToSign = tx.serializeMessage();
	// the real data singer need to sign.

	// 2. Sign Transaction
	// use any lib you like, the main idea is to use ed25519to sign it.
	// the return signature should be 64 bytes.
	let feePayerSignature = nacl.sign.detached(realDataNeedToSign, feePayer.secretKey);
	let aliceSignature = nacl.sign.detached(realDataNeedToSign, alice.secretKey);

	// 3. Recover Transaction

	// you can verify signatures before you recovering the transaction
	// you should use the raw pubkey(32 bytes) to verify );
	let verifyFeePayerSignatureResult = nacl.sign.detached.verify(
		realDataNeedToSign,
		feePayerSignature,
		feePayer.publicKey.toBytes(),
	);

	console.log(`verify feePayer signature: ${verifyFeePayerSignatureResult}`);

	let verifyAliceSignatureResult = nacl.sign.detached.verify(
		realDataNeedToSign,
		aliceSignature,
		alice.publicKey.toBytes(),
	);
	console.log(`verify alice signature: ${verifyAliceSignatureResult}`);

	console.log("Before transaction");
	console.log(`feePayer balance: ${await connection.getBalance(feePayer.publicKey)}`);
	console.log(`alice balance: ${await connection.getBalance(alice.publicKey)}`);
	console.log(`bob balance: ${await connection.getBalance(bob.publicKey)}`);

	console.log("send the offline transaction");

	// there are two ways you can recover the tx
	// 3.a Recover Transaction (usepopulate then addSignature)

	// {
	// 	let recoverTx = Transaction.populate(Message.from(realDataNeedToSign));
	// 	recoverTx.addSignature(feePayer.publicKey, Buffer.from(feePayerSignature));
	// 	recoverTx.addSignature(alice.publicKey, Buffer.from(aliceSignature));
	//
	// 	// 4. Send transaction
	// 	console.log(`txhash: ${await connection.sendRawTransaction(recoverTx.serialize())}`);
	// }

	// or

	// 3.b Recover Transaction (use populate with signature)

	{
		let recoverTx = Transaction.populate(Message.from(realDataNeedToSign), [
			bs58.encode(feePayerSignature),
			bs58.encode(aliceSignature),
		]);

		// 4. Send transaction
		const txHash = await connection.sendRawTransaction(recoverTx.serialize());
		console.log(`txhash: ${txHash}`);
		const blockHash = await connection.getLatestBlockhash();

		// wait offline tx confirm
		await connection.confirmTransaction({
			blockhash: blockHash.blockhash,
			lastValidBlockHeight: blockHash.lastValidBlockHeight,
			signature: txHash,
		});
	}

	console.log("After transaction");
	console.log(`feePayer balance: ${await connection.getBalance(feePayer.publicKey)}`);
	console.log(`alice balance: ${await connection.getBalance(alice.publicKey)}`);
	console.log(`bob balance: ${await connection.getBalance(bob.publicKey)}`);

	// if this process takes too long, your recent blockhash will expire (after 150blocks).
	// you can use `durable nonce` to get rid of it.
}

await offlineTx();
