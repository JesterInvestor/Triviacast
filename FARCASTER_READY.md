Purpose
You are an AI agent helping developers troubleshoot Farcaster Mini Apps. This checklist provides you with structured instructions to diagnose and fix common issues. Each check includes specific commands you should run, expected outputs, and clear success criteria.

General Guidelines
As an AI agent, follow these guidelines:

Ask clarifying questions until you have high confidence in the task. Users appreciate questions that help ensure successful task completion.
Be specific when something is unclear or inaccessible. Ask for file paths, URLs, or specific error messages.
Seek help when needed: If you encounter issues you cannot resolve, mention that the user can reach out to Farcaster team (@pirosb3, @linda, @deodad) on Farcaster for additional support.
Verify assumptions before making changes. It's better to confirm than to proceed with uncertainty.
Common LLM Pitfalls
When helping developers with Mini Apps:

DO NOT reference Frames v1 syntax or fields like fc:frame:image, fc:frame:button
DO NOT invent manifest fields not in the official schema
DO NOT mix Frame and Mini App terminology (Mini Apps are not Frames)
DO NOT use outdated examples from before 2024
ALWAYS verify fields against the official SDK schema at @farcaster/miniapp-sdk
ALWAYS use the official documentation at miniapps.farcaster.xyz
ALWAYS check that examples use miniapp or frame (not frames) in manifest
If using example code, ensure it's from:

Official Mini Apps documentation (this site)
The @farcaster/miniapp-sdk package
Examples that use "version": "1" not "version": "next"
Prerequisites
Before you begin troubleshooting, ensure the developer understands:

What Mini Apps are
How manifests work
SDK actions and capabilities
Check 1: Manifest Configuration
1.1 Verify Manifest Accessibility
Command:

curl -s https://{domain}/.well-known/farcaster.json
Expected Output:

{
  "accountAssociation": {
    "header": "...",
    "payload": "...", 
    "signature": "..."
  },
  "frame": {
    "version": "1",
    "name": "App Name",
    "iconUrl": "https://...",
    "homeUrl": "https://..."
  }
}
Success Criteria:
HTTP 200 response
Valid JSON format
Contains accountAssociation object
Contains frame object with required fields
If Check Fails:
Manifest not found (404)
Manifest exists but unsigned
1.2 Validate Manifest Schema
Valid Manifest Example:
Example Manifest (Validated against current schema)
{
  "accountAssociation": {
    "header": "eyJmaWQiOjEyMTUyLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4MEJGNDVGOTY3RTkwZmZENjA2MzVkMUFDMTk1MDYyYTNBOUZjQzYyQiJ9",
    "payload": "eyJkb21haW4iOiJ3d3cuYm91bnR5Y2FzdGVyLnh5eiJ9",
    "signature": "MHhmMTUwMWRjZjRhM2U1NWE1ZjViNGQ5M2JlNGIxYjZiOGE0ZjcwYWQ5YTE1OTNmNDk1NzllNTA2YjJkZGZjYTBlMzI4ZmRiNDZmNmVjZmFhZTU4NjYwYzBiZDc4YjgzMzc2MDAzYTkxNzhkZGIyZGIyZmM5ZDYwYjU2YTlmYzdmMDFj"
  },
  "frame": {
    "version": "1",
    "name": "Bountycaster",
    "iconUrl": "https://www.bountycaster.xyz/static/images/bounty/logo.png",
    "homeUrl": "https://www.bountycaster.xyz",
    "imageUrl": "https://www.bountycaster.xyz/static/images/bounty/logo.png",
    "buttonTitle": "Open Bounty",
    "splashImageUrl": "https://www.bountycaster.xyz/static/images/bounty/logo.png",
    "splashBackgroundColor": "#FFFFFF"
  }
}
1.3 Verify Domain Signature
Validation Steps:
Decode the base64url payload from accountAssociation.payload
Extract the domain field
Verify domain matches where manifest is hosted
Example:

// If hosted at www.example.com
const payload = JSON.parse(atob(accountAssociation.payload));
// payload.domain should be "www.example.com" (including subdomain)
Important: The signed domain must match exactly, including subdomains.

Check 2: Embed Metadata
2.1 Verify Embed Tags on Entry Points
What to check:
Root URL of the mini app
All shareable pages (products, profiles, content)
Command:

curl -s https://{domain}/{path} | grep -E 'fc:miniapp|fc:frame'
Expected Output:

<meta name="fc:miniapp" content='{"version":"1","imageUrl":"...","button":{...}}' />
2.2 Validate Embed Structure
For Next.js Applications:

// app/layout.tsx or pages with generateMetadata
import { Metadata } from 'next'
 
const frame = {
  version: "1",  // Not "next" - must be "1"
  imageUrl: "https://example.com/og-image.png", // 3:2 aspect ratio
  button: {
    title: "Open App",  // Max 32 characters
    action: {
      type: "launch_frame",
      name: "My Mini App",
      url: "https://example.com",  // Optional, defaults to current URL
      splashImageUrl: "https://example.com/icon.png", // 200x200px
      splashBackgroundColor: "#f7f7f7"
    }
  }
}
 
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: "My Mini App",
    openGraph: {
      title: "My Mini App",
      description: "Description here"
    },
    other: {
      "fc:miniapp": JSON.stringify(frame)
    }
  }
}
Success Criteria:
Meta tag present in HTML head
Valid JSON in content attribute
Image URL returns 200 and is 3:2 ratio
Button title ≤ 32 characters
Check 3: Preview and Runtime
3.1 Test in Preview Tool
URL Format:

https://farcaster.xyz/~/developers/mini-apps/preview?url={encoded-mini-app-url}
Example:

# Encode your URL
encoded_url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('https://example.com/page'))")
echo "https://farcaster.xyz/~/developers/mini-apps/preview?url=$encoded_url"
3.2 Verify App Initialization
Common Issues:
App not loading (infinite splash screen)
Tunnel URLs not working (ngrok, localtunnel)
Post-Check Verification
After making any changes, you should:

Re-verify the manifest is deployed:

curl -s https://{domain}/.well-known/farcaster.json | jq .
Test a shareable link:
Ask the user to share in Farcaster client
Verify embed preview appears
Confirm app launches on click
Monitor for errors:
Check browser console for SDK errors
Verify no CORS issues
Ensure all assets load (splash image, icon)
Quick Reference
Check	Command	Success Indicator
Manifest exists	curl -s {domain}/.well-known/farcaster.json	HTTP 200, valid JSON
Manifest signed	Decode payload, check domain	Domain matches hosting
Embed present	curl -s {url} | grep fc:miniapp	Meta tag found
Preview works	Open preview tool URL	App loads, no errors
App ready	Check console logs	ready() called