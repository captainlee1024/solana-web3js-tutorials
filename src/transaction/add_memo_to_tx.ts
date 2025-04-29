import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { airdropAndConfirm, getLocalNetConnection } from "./utils.js";
import { createMemoInstruction } from "@solana/spl-memo";

const connection = getLocalNetConnection();

const feePayer = Keypair.generate();

// request and confirm
await airdropAndConfirm(connection, feePayer.publicKey);

// create a memo instruction
const memoInstruction = createMemoInstruction("Hello, Memo!");

// create transaction and add the memo instruction
const transaction = new Transaction().add(memoInstruction);

// sign and send transaction
const transactionSignature = await sendAndConfirmTransaction(connection, transaction, [feePayer]);

console.log("Transaction Signature: ", transactionSignature);

// get the transaction, and find the memo
// get transaction
const txFromChain = await connection.getTransaction(transactionSignature, {
	commitment: "confirmed",
	maxSupportedTransactionVersion: 0,
});
if (!txFromChain) {
	console.log("Transaction not found on chain");
	process.exit(1);
}

console.log("get transaction on chain");

// find memo in the transaction
// construct memo program id
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
// get accountkeys from tx
let accountKeys = txFromChain.transaction.message.getAccountKeys().staticAccountKeys;

// let accountKeys;
// if ("getAccountKeys" in message) {
// 	accountKeys = message.getAccountKeys().staticAccountKeys;
// } else {
// 	accountKeys = message.accountKeys; // fallback for legacy tx
// }

// find the memo instruction
const ixWithMemo = txFromChain.transaction.message.compiledInstructions.find((ix) => {
	const programId = accountKeys[ix.programIdIndex];
	return programId.toBase58() === MEMO_PROGRAM_ID.toBase58();
});

if (ixWithMemo) {
	// prin the memo instruction data
	const memoText = ixWithMemo.data.toString();
	console.log("Get Memo From OnChain Tx: ", memoText);
	// print the message struct
	console.log("OnChain message:");
	// Message {
	//   header: {
	//     numReadonlySignedAccounts: 0,
	//     numReadonlyUnsignedAccounts: 1,
	//     numRequiredSignatures: 1
	//   },
	//   accountKeys: [
	//     PublicKey [PublicKey(AYPukB3KSQx8m4q7vCZByzisazaLtdF9wTG3vkJ7KP46)] {
	//       _bn: <BN: 8dc417552bd38666b62a14a828d0dba4952c4ce71c6d90399b02888825df4fdb>
	//     },
	//     PublicKey [PublicKey(MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)] {
	//       _bn: <BN: 54a535a992921064d24e87160da387c7c35b5ddbc92bb81e41fa8404105448d>
	//     }
	//   ],
	//   recentBlockhash: 'Ga9ZScpGtS9XM7r27VkLdhJP6PJ58T7B9SNPmRrbD7N1',
	//   instructions: [
	//     {
	//       accounts: [],
	//       data: '2NEpo7TZsLAQwkwdi',
	//       programIdIndex: 1,
	//       stackHeight: null
	//     }
	//   ],
	//   indexToProgramIds: Map(1) {
	//     1 => PublicKey [PublicKey(MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)] {
	//       _bn: <BN: 54a535a992921064d24e87160da387c7c35b5ddbc92bb81e41fa8404105448d>
	//     }
	//   }
	// }
	console.log(txFromChain.transaction.message);
} else {
	console.log("No memo found on chain: ", txFromChain.transaction.message, accountKeys);
}
