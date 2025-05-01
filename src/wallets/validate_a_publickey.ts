import { PublicKey } from '@solana/web3.js';

const key = new PublicKey('2VoohgQhetD3Xc32txavMzzLZ4Wgc5CnCS1z9umNvLju');

// 在曲线上
console.log(PublicKey.isOnCurve(key.toBase58()));

const offCurveAddress = new PublicKey('4BJXYkfvg37zEmBbsacZjeQDpTNx91KppxFJxRqrz48e');

// 不在曲线上
console.log(PublicKey.isOnCurve(offCurveAddress.toBytes()));

// 无效的公钥
try {
  new PublicKey('xxxx');
} catch (err) {
  console.log('parsing pk failed, err: ', (err as Error).message);
}
