import { NextResponse } from "next/server";

function base64UrlToString(input: string): string {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4 === 0 ? normalized : normalized + "=".repeat(4 - (normalized.length % 4));
    return Buffer.from(pad, "base64").toString("utf8");
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost = req.headers.get("x-forwarded-host");
  const proto = xfProto || url.protocol.replace(":", "");
  const host = xfHost || url.host;

  const base = `${proto}://${host}`;
  const manifestUrl = `${base}/.well-known/farcaster.json`;

  const result: {
    ok: boolean;
    manifestUrl: string;
    requestHost: string;
    payloadDomain: string | null;
    httpStatus: number | null;
    errors: string[];
    warnings: string[];
    signatureStatus: "unknown" | "present" | "missing";
    manifest?: unknown;
    accountAssociation?: unknown;
    miniapp?: unknown;
  } = {
    ok: false,
    manifestUrl,
    requestHost: host,
    payloadDomain: null,
    httpStatus: null,
    errors: [],
    warnings: [],
    signatureStatus: "unknown",
  };

  try {
    const resp = await fetch(manifestUrl, { redirect: "follow" });
    result.httpStatus = resp.status;
    if (!resp.ok) {
      result.errors.push(`Failed to fetch manifest: HTTP ${resp.status}`);
      return NextResponse.json(result, { status: 502 });
    }

    const json = await resp.json();
    const assoc = json?.accountAssociation;
    if (!assoc) {
      result.errors.push("Missing accountAssociation object");
    }
    const header = assoc?.header;
    const payload = assoc?.payload;
    const signature = assoc?.signature;
    if (!header || !payload || !signature) {
      result.errors.push("accountAssociation.header/payload/signature must all be present");
      result.signatureStatus = "missing";
    } else {
      result.signatureStatus = "present"; // Shallow check only; cryptographic verification not performed here
    }

    // Decode payload and extract domain
    if (payload) {
      const decoded = base64UrlToString(payload);
      try {
        const payloadJson = JSON.parse(decoded);
        result.payloadDomain = payloadJson?.domain ?? null;
        if (!result.payloadDomain) {
          result.errors.push("Decoded payload missing domain field");
        } else {
          // Compare against request host (strip port if any)
          const reqHostname = host.split(":")[0];
          if (payloadJson.domain !== reqHostname) {
            result.errors.push(
              `Domain mismatch: payload.domain='${payloadJson.domain}' != request.host='${reqHostname}'`
            );
          }
        }
      } catch (e) {
        result.errors.push("Failed to decode/parse accountAssociation.payload as JSON");
      }
    }

    // Basic presence check for miniapp/frame block
    if (!json?.miniapp && !json?.frame) {
      result.warnings.push("Manifest missing 'miniapp' (or 'frame') section");
    }

    result.ok = result.errors.length === 0;
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (err: any) {
    result.errors.push(`Unexpected error: ${err?.message || String(err)}`);
    return NextResponse.json(result, { status: 500 });
  }
}
