import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch'; //使用 node-fetch 的 RequestInit 和 Response 类型

export async function fetchWithProxy(
  input: URL | RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const proxyUrl = 'http://127.0.0.1:7897';
  const proxyAgent = new HttpsProxyAgent(proxyUrl);

  const processedInput =
    typeof input === 'string' && input.slice(0, 2) === '//' ? 'https:' + input : input;

  const result = await fetch(processedInput, {
    ...init,
    agent: proxyAgent,
  });

  // Patch the result to add the `bytes` method
  // This is a workaround for the fact that `node-fetch` does not support `bytes` method directly
  // and we need to convert the response to a Uint8Array.
  // The `bytes` method is not part of the standard Fetch API, so we need to add it manually.
  // Solana SDK 内部需要使用 response.bytes() 来读取 body 的二进制数据
  // 但是标准的 fetch Response 只有 arrayBuffer() 方法， 没有 .bytes() 方法
  // 所以solana/web3.js 要求 fetch 返回的 Resposne 必须自己实现一个 .bytes() 方法
  const patchedResult = Object.assign(result, {
    bytes: async () => {
      const buffer = await result.arrayBuffer();
      return new Uint8Array(buffer);
    },
  });

  return patchedResult as unknown as Response;
}
