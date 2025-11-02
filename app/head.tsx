export default function Head() {
  // fc:miniapp / fc:frame meta tags for the site root so sharing https://triviacast.xyz
  // renders a rich embed in Farcaster clients.
  const miniapp = '{"version":"1","imageUrl":"https://triviacast.xyz/image.png","button":{"title":"Open Triviacast","action":{"type":"launch_miniapp","url":"https://triviacast.xyz","name":"Triviacast","splashImageUrl":"https://triviacast.xyz/R11.png","splashBackgroundColor":"#FFE4EC"}}}';
  const frame = '{"version":"1","imageUrl":"https://triviacast.xyz/image.png","button":{"title":"Open Triviacast","action":{"type":"launch_frame","url":"https://triviacast.xyz","name":"Triviacast","splashImageUrl":"https://triviacast.xyz/R11.png","splashBackgroundColor":"#FFE4EC"}}}';

  return (
    <>
      <meta name="fc:miniapp" content={miniapp} />
      <meta name="fc:frame" content={frame} />
      <meta property="og:title" content="Triviacast — Test your brain" />
      <meta property="og:description" content="Trivia quiz mini-game — challenge friends, earn T Points, and share your results." />
      <meta property="og:image" content="https://triviacast.xyz/image.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
