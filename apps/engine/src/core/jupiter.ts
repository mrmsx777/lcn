import { createJupiterApiClient } from '@jup-ag/api';
import { VersionedTransaction, Connection } from '@solana/web3.js';
import { connection } from './rpc';
import { Keyring } from './keyring';

const jupiterQuoteApi = createJupiterApiClient();

export const getPrices = async (mints: string[]): Promise<Record<string, number>> => {
  if (mints.length === 0) return {};
  try {
    // We only fetch the first 30 to avoid DexScreener URL length limits
    const chunk = mints.slice(0, 30);
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`);
    if (!res.ok) return {};

    const data: any = await res.json();
    const prices: Record<string, number> = {};

    if (data && data.pairs && Array.isArray(data.pairs)) {
      for (const pair of data.pairs) {
        // DexScreener returns multiple pairs per token, we just grab the first valid price we see for the mint
        const mint = pair.baseToken?.address;
        if (mint && pair.priceUsd && !prices[mint]) {
          prices[mint] = parseFloat(pair.priceUsd);
        }
      }
    }
    return prices;
  } catch (err) {
    return {};
  }
};

export const executeSwap = async (
  keyring: Keyring,
  inputMint: string,
  outputMint: string,
  amountInLamports: number,
  slippageBps: number = 1000 // 10% for volatile meme coins
): Promise<string> => {
  try {
    const pubkey = keyring.getPublicKey().toBase58();

    // 1. Get quote
    const quoteResponse = await jupiterQuoteApi.quoteGet({
      inputMint,
      outputMint,
      amount: amountInLamports,
      slippageBps,
    });

    if (!quoteResponse) {
      throw new Error('No route found from Jupiter');
    }

    // 2. Get swap transaction with priority fees
    const swapResponse = await jupiterQuoteApi.swapPost({
      swapRequest: {
        quoteResponse,
        userPublicKey: pubkey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 5000000, // up to 0.005 SOL for ultra-fast confirmation
            priorityLevel: "veryHigh"
          }
        } as any
      },
    });

    // 3. Deserialize and sign transaction
    const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
    let transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // Sign using Keyring
    transaction = keyring.signVersionedTransaction(transaction);

    // 4. Send and confirm
    const latestBlockHash = await connection.getLatestBlockhash();
    const rawTransaction = transaction.serialize();

    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 20 // Spam the RPC node to prevent blockheight expiry
    });

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid
    }, 'confirmed');

    return txid;
  } catch (err: any) {
    console.error('Jupiter Swap Error:', err);
    throw new Error(`Swap failed: ${err.message}`);
  }
};
