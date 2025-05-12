import { sleep, EtherspotBundler, ModularSdk,  } from '@etherspot/modular-sdk';
import * as dotenv from 'dotenv';
import { defineChain, parseEther } from 'viem';

dotenv.config();

const recipient = '0x80a1874E1046B1cc5deFdf4D3153838B72fF94Ac'; // recipient wallet address
const value = '0.0000001'; // transfer value
const apiKey = process.env.API_KEY;
const bundlerApiKey = process.env.API_KEY;
const entryPointAddress = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'; // entry point address
const walletFactoryAddress = '0xB3AD9B9B06c6016f81404ee8FcCD0526F018Cf0C'; // wallet factory address
const bootstrapAddress = '0x153e26707DF3787183945B88121E4Eb188FDCAAA'; // bootstrap address
const multipleOwnerECDSAValidatorAddress = '0x810FA4C915015b703db0878CF2B9344bEB254a40'; // multi owner ECDSA validator factory address
const bundlerUrl = process.env.BUNDLER_URL;
const paymasterUrl = process.env.PAYMASTER_URL;

// tsx examples/paymaster/paymaster.ts
async function main() {
  // initializating sdk...
  const carrchainTestnet = defineChain({
    id: 76672,
    name: 'Carrchain Testnet',
    nativeCurrency: { name: 'Carr', symbol: 'CARR', decimals: 18 },
    rpcUrls: {
      default: {
        http: ['https://rpc-testnet.carrchain.io/']
      }
    },
    blockExplorers: {
      default: {
        name: 'Carnomaly',
        url: 'https://testnet.carrscan.io/',
      },
    },
    sourceId: 421614
  });

  // initializating sdk...
  const modularSdk = new ModularSdk(
    process.env.WALLET_PRIVATE_KEY as string,
    {
      chain: carrchainTestnet,
      chainId: 76672,
      bundlerProvider: new EtherspotBundler(76672, bundlerApiKey, bundlerUrl),
      index: 0,
      entryPointAddress,
      walletFactoryAddress,
      bootstrapAddress,
      multipleOwnerECDSAValidatorAddress,
      rpcProviderUrl: bundlerUrl,
    }
  );

  // get address of EtherspotWallet...
  const address: string = await modularSdk.getCounterFactualAddress();
  console.log('\x1b[33m%s\x1b[0m', `EtherspotWallet address: ${address}`);

  // clear the transaction batch
  await modularSdk.clearUserOpsFromBatch();

  // add transactions to the batch
  const transactionBatch = modularSdk.addUserOpsToBatch({
    to: recipient,
    value: parseEther(value),
  });
  console.log('transactions: ', transactionBatch);

  // get balance of the account address
  const balance = await modularSdk.getNativeBalance();

  console.log('balances: ', balance);

  // estimate transactions added to the batch and get the fee data for the UserOp
  const op = await modularSdk.estimate({
    paymasterDetails: {
      url: `${paymasterUrl}?apiKey=${apiKey}&chainId=76672&useVp=true`,
      context: { mode: 'sponsor' }
    }
  });

  console.log('UserOp: ', op);

  // sign the UserOp and sending to the bundler...
  const uoHash = await modularSdk.send(op);
  console.log(`UserOpHash: ${uoHash}`);

  // get transaction hash...
  console.log('Waiting for transaction...');
  let userOpsReceipt: string | null = null;
  const timeout = Date.now() + 60000; // 1 minute timeout
  while ((userOpsReceipt == null) && (Date.now() < timeout)) {
    await sleep(2);
    userOpsReceipt = await modularSdk.getUserOpReceipt(uoHash);
  }
  console.log('\x1b[33m%s\x1b[0m', `Transaction Receipt: `, userOpsReceipt);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
