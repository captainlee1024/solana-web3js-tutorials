import { Keypair, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { airdropAndConfirm, getLocalNetConnection } from "../transaction/utils.js";

const connection = getLocalNetConnection();

const fromKeypair = Keypair.generate();
const newAccnount = Keypair.generate();

await airdropAndConfirm(connection, fromKeypair.publicKey);

// amount of space to reserve for the account
const space = 0;

// Seed the created account with lamports for rent exemption
const rentLamports = await connection.getMinimumBalanceForRentExemption(space);

const createAccountTransaction = new Transaction().add(
	SystemProgram.createAccount({
		/** The account that will transfer lamports to the created account */
		fromPubkey: fromKeypair.publicKey,
		/** Public key of the created account */
		newAccountPubkey: newAccnount.publicKey,
		/** Amount of lamports to transfer to the created account */
		lamports: rentLamports,
		/** Amount of space in bytes to allocate to the created account */
		space: space,
		/** Public key of the program to assign as the owner of the created account */
		programId: SystemProgram.programId,
	}),
);

await sendAndConfirmTransaction(connection, createAccountTransaction, [fromKeypair, newAccnount]);
