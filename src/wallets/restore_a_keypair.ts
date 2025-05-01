import { Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

export async function loadKeypairFromFile(filePath: string): Promise<Keypair> {
  const resolvePath = path.resolve(
    filePath.startsWith('~') ? filePath.replace('~', homedir()) : filePath
  );

  const loadedKeyBytes = Uint8Array.from(JSON.parse(readFileSync(resolvePath, 'utf8')));

  return await Keypair.fromSecretKey(loadedKeyBytes);
}

const keypair = await loadKeypairFromFile('~/.config/solana/id.json');
console.log(keypair.publicKey.toBase58());

export async function loadDefaultKeypairFromFile(): Promise<Keypair> {
  return await loadKeypairFromFile('~/.config/solana/id.json');
}

const keypairFromLoadDefaultKeypairFromFile = await loadDefaultKeypairFromFile();
console.log(keypairFromLoadDefaultKeypairFromFile.publicKey.toBase58());
