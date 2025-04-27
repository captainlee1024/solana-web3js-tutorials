# Solana Web3.js Tutorials

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-2.1+-00FFBD.svg?logo=solana)](https://solana.com/)

A comprehensive collection of Solana Web3.js examples implemented in TypeScript, covering from fundamental operations to advanced features.

## 🚀 Quick Start

Prerequisites

- Node.js v18+
- Solana CLI (for local testing)

Installation

```bash
npm install
```

Launch Local Node

```bash
solana-test-validator -l local-testdata/test-ledger
```

Run Example

```bash
# Execute airdrop example
npx tsx src/airdrop
```

## 🛣️ Development Roadmap

### ✅ Currently Implemented

- [x] SOL Airdrop (`/src/core/airdrop.ts`) - Basic SOL distribution example
- [x] Wallet Management (`/src/core/wallets.ts`) - Keypair generation and restoration

### 🔧 In Progress

- [ ] NFT Operations
  - [ ] Mint NFT
  - [ ] Transfer NFT
  - [ ] Burn NFT

### ⏳ Planned Features

- [ ] Token Operations
  - [ ] Create SPL Token
  - [ ] Token Transfers
  - [ ] Token Burning
- [ ] Program Interactions
  - [ ] Basic CPI Calls
  - [ ] PDA Management
- [ ] Advanced Scenarios
  - [ ] Transaction Monitoring
  - [ ] Bulk Transactions
  - [ ] Error Recovery
