export default function Head() {
  // fc:miniapp / fc:frame meta tags make this page embeddable in Farcaster clients.
  // The content must be a JSON string with version, imageUrl and button.action details.
  const miniappObj = {
    version: '1',
    imageUrl: 'https://triviacast.xyz/og-image-1200x630.png',
    button: {
      title: 'Play Challenge',
      action: {
        type: 'launch_miniapp',
        url: 'https://triviacast.xyz/farcaster-lookup',
        name: 'Triviacast',
        splashImageUrl: 'https://triviacast.xyz/splash-200.png',
        splashBackgroundColor: '#FFE4EC',
      },
    },
  } as const;

  const miniapp = JSON.stringify(miniappObj);

  return (
    <>
      {/* Use fc:miniapp only — don't include fc:frame for new Mini Apps */}
      <meta name="fc:miniapp" content={miniapp} />
      {/* Helpful Open Graph tags as fallback for other platforms */}
      <meta property="og:title" content="Triviacast — Challenge a friend" />
      <meta property="og:description" content="Dare a friend: lookup their Farcaster handle, play a quiz, edit the preview, and post to challenge them." />
  <meta property="og:image" content="https://triviacast.xyz/og-image-1200x630.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}

