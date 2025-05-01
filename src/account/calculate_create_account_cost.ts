// Solana 上维持账户活跃会产生数据存储成本，称为租金（rent）
// 计算时，需要考虑计划在账户中存储的数据量
// 账户关闭后，租金可以回收

import { getLocalNetConnection } from '../transaction/utils.js';

const connection = getLocalNetConnection();
// allocate 1500 bytes of extra space in the account for data
const space = 1500;
const lamports = await connection.getMinimumBalanceForRentExemption(space);
console.log('Minimum balance for rent exemption: ', lamports);
