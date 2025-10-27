import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

if (!process.env.NEYNAR_API_KEY) {
  // Do not throw here; allow the app to run in dev without Neynar configured.
  // Consumers should check for NEYNAR_API_KEY before calling the client.
}

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY ?? '',
});

const neynarClient = new NeynarAPIClient(config);

export default neynarClient;
