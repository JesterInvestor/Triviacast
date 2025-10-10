import { createThirdwebClient, type ThirdwebClient } from 'thirdweb';

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

export let client: ThirdwebClient | undefined;
if (clientId) {
  client = createThirdwebClient({ clientId });
}
