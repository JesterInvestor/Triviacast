import crypto from "crypto";

async function main() {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;
  if (!apiKey || !signerUuid) {
    console.error("Missing NEYNAR_API_KEY or NEYNAR_SIGNER_UUID env vars");
    process.exit(1);
  }

  // 1. Signer metadata lookup
  const metaResp = await fetch(
    `https://api.neynar.com/v2/farcaster/signer?signer_uuid=${encodeURIComponent(signerUuid)}`,
    { headers: { "x-api-key": apiKey } }
  );
  const metaJson = await metaResp.json().catch(() => ({}));
  if (!metaResp.ok) {
    console.error("Signer lookup failed", metaResp.status, metaJson);
    process.exit(1);
  }
  console.log("Signer metadata:", metaJson);

  // 2. Dry-run publish (optional). To skip set DRY_RUN_ONLY=1.
  if (process.env.DRY_RUN_ONLY === "1") {
    console.log("DRY_RUN_ONLY=1 set, skipping publish.");
    return;
  }

  const idem = crypto.randomBytes(12).toString("hex").slice(0, 16);
  const body = {
    signer_uuid: signerUuid,
    text: `Triviacast signer verification ping (${idem})`,
    channel_id: "neynar",
    idem,
  };

  const castResp = await fetch("https://api.neynar.com/v2/farcaster/cast/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });
  const castJson = await castResp.json().catch(() => ({}));
  if (!castResp.ok) {
    console.error("Publish failed", castResp.status, castJson);
    process.exit(1);
  }
  console.log("Publish success:", castJson);
}

main().catch((e) => {
  console.error("Unexpected error", e);
  process.exit(1);
});