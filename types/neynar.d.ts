declare module '@neynar/nodejs-sdk' {
  // Minimal ambient declarations to allow TypeScript to compile when the SDK doesn't provide types.
  // We intentionally keep these broad (any) because the runtime import is used server-side.
  export class Configuration {
    constructor(opts?: any);
  }
  export class NeynarAPIClient {
    constructor(cfg?: any);
    fetchBulkUsersByEthOrSolAddress(opts?: any): Promise<any>;
  }
  export default {
    Configuration: Configuration,
    NeynarAPIClient: NeynarAPIClient,
  } as any;
}
