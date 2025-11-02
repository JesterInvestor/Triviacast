export default function Head() {
  // fc:miniapp / fc:frame meta tags for the site root so sharing https://triviacast.xyz
  // renders a rich embed in Farcaster clients.
  const miniapp = '{"version":"1","imageUrl":"https://triviacast.xyz/og-image-1200x630.png","button":{"title":"Open Triviacast","action":{"type":"launch_miniapp","url":"https://triviacast.xyz","name":"Triviacast","splashImageUrl":"https://triviacast.xyz/splash-200.png","splashBackgroundColor":"#FFE4EC"}}}';

  return (
    <>
      {/* Use fc:miniapp only — fc:frame is legacy and should not be used for new Mini Apps */}
      <meta name="fc:miniapp" content={miniapp} />
      <meta property="og:title" content="Triviacast — Test your brain" />
      <meta property="og:description" content="Trivia quiz mini-game — challenge friends, earn T Points, and share your results." />
  <meta property="og:image" content="https://triviacast.xyz/hero-1200x630.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
