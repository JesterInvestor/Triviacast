export default function Head() {
  // fc:miniapp meta for leaderboard page — used by Farcaster clients to render embeds
  const miniappObj = {
    version: '1',
    imageUrl: 'https://triviacast.xyz/og-image-1200x630.png',
    button: {
      title: 'View Leaderboard',
      action: {
        type: 'launch_frame',
        url: 'https://triviacast.xyz/leaderboard',
        name: 'Triviacast',
        splashImageUrl: 'https://triviacast.xyz/splash-200.png',
        splashBackgroundColor: '#FFE4EC',
      },
    },
  } as const;

  const miniapp = JSON.stringify(miniappObj);

  return (
    <>
      <meta name="fc:miniapp" content={miniapp} />
      <meta property="og:title" content="Triviacast — Leaderboard" />
      <meta property="og:description" content="Top Brain Power Rankings — see who leads the Triviacast leaderboard." />
      <meta property="og:image" content="https://triviacast.xyz/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
