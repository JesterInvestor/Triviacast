export default function Head() {
  // fc:miniapp / fc:frame meta tags make this page embeddable in Farcaster clients.
  // The content must be a JSON string with version, imageUrl and button.action details.
  const miniapp = '{"version":"1","imageUrl":"https://triviacast.xyz/og-image.png","button":{"title":"Play Challenge","action":{"type":"launch_miniapp","url":"https://triviacast.xyz/farcaster-lookup","name":"Triviacast","splashImageUrl":"https://triviacast.xyz/R11.png","splashBackgroundColor":"#FFE4EC"}}}';
  const frame = '{"version":"1","imageUrl":"https://triviacast.xyz/og-image.png","button":{"title":"Play Challenge","action":{"type":"launch_frame","url":"https://triviacast.xyz/farcaster-lookup","name":"Triviacast","splashImageUrl":"https://triviacast.xyz/R11.png","splashBackgroundColor":"#FFE4EC"}}}';

  return (
    <>
      <meta name="fc:miniapp" content={miniapp} />
      {/* Backwards compatibility */}
      <meta name="fc:frame" content={frame} />
      {/* Helpful Open Graph tags as fallback for other platforms */}
      <meta property="og:title" content="Triviacast — Challenge a friend" />
      <meta property="og:description" content="Dare a friend: lookup their Farcaster handle, play a quiz, edit the preview, and post to challenge them." />
      <meta property="og:image" content="https://triviacast.xyz/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
export default function Head() {
  // Farcaster miniapp/embed meta tags (fc:miniapp and fc:frame) must contain
  // JSON string values. We use the canonical site URL and the app icon
  // at /icon.png for the embed image so clients will show an image.
  const miniapp = {
    version: "1",
    imageUrl: "https://triviacast.xyz/icon.png",
    button: {
      title: "Play",
      action: {
        type: "launch_miniapp",
        url: "https://triviacast.xyz/farcaster-lookup",
        name: "Triviacast",
        splashImageUrl: "https://triviacast.xyz/icon.png",
        splashBackgroundColor: "#FFE4EC",
      },
    },
  };

  const frame = {
    ...miniapp,
    button: {
      ...miniapp.button,
      action: {
        ...miniapp.button.action,
        type: "launch_frame",
      },
    },
  };

  // JSON stringified values; Farcaster clients expect the JSON in the meta tag
  const miniappContent = JSON.stringify(miniapp);
  const frameContent = JSON.stringify(frame);

  return (
    <>
      {/* Farcaster Mini App embed metadata */}
      <meta name="fc:miniapp" content={miniappContent} />
      {/* Backwards-compatible frame metadata */}
      <meta name="fc:frame" content={frameContent} />

      {/* Helpful fallbacks for other platforms */}
      <meta property="og:title" content="Triviacast Challenge" />
      <meta property="og:description" content="Challenge friends on Triviacast — search a Farcaster handle, play the quiz, edit the preview, and post to Warpcast/Base." />
      <meta property="og:image" content="https://triviacast.xyz/icon.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
