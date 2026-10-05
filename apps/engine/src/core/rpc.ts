import { Connection } from '@solana/web3.js';
import { ENV } from '../config';

export const connection = new Connection(ENV.RPC_URL, {
  wsEndpoint: ENV.WS_URL,
  commitment: 'confirmed'
});
