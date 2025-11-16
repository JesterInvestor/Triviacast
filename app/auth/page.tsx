import AuthButton from "@/components/AuthButton";
import ProtectedFeature from "@/components/ProtectedFeature";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <main className="mx-auto max-w-2xl p-4 space-y-6">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Sign In with Farcaster</h1>
        <p className="text-sm text-gray-600">
          This demo uses <code>@coinbase/onchainkit</code> MiniKit <code>useAuthenticate</code> to provide
          cryptographically secure authentication in Farcaster Mini Apps.
        </p>
        <AuthButton />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Protected Feature</h2>
        <ProtectedFeature />
      </section>
    </main>
  );
}
