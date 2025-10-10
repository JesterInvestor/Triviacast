import { NextResponse } from "next/server";

export async function GET() {
  // This endpoint just exists as a smoke check documentation pointer.
  // To verify ready() ran in the client, open DevTools console while inside Farcaster host and run:
  //   window.__TRIVIACAST_READY_CALLED === true
  // We'll also serve a tiny HTML with instructions for convenience.
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Triviacast Ready Check</title></head><body style="font:14px system-ui;padding:24px;">\n<h1>Triviacast Mini App: ready() check</h1>\n<p>To confirm sdk.actions.ready() ran inside the Farcaster client, open DevTools console and evaluate:</p>\n<pre>window.__TRIVIACAST_READY_CALLED === true</pre>\n<p>If false, ensure the app loaded fully and try again after interacting. The app retries on visibility changes.</p>\n</body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
