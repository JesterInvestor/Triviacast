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

