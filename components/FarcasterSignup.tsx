"use client";

import React, { useState } from 'react';
import * as ed from '@noble/ed25519';
import { bytesToHex } from 'viem';

// Minimal frontend signup component for collecting EIP-712 Register and Add
// signatures from the user's wallet and sending them to the backend.
// The heavy @farcaster/hub-nodejs helpers are imported dynamically inside
// handlers to avoid SSR/import-time issues.

export default function FarcasterSignup() {
  const [status, setStatus] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [accountPubKeyHex, setAccountPubKeyHex] = useState<string | null>(null);
  const [metadataHex, setMetadataHex] = useState<string | null>(null);

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      setStatus('No injected wallet detected (MetaMask / WalletConnect).');
      return;
    }
    try {
      const accs = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      setAddress(accs?.[0] || null);
      setStatus(`Connected: ${accs?.[0]}`);
    } catch (e: any) {
      setStatus('Wallet connection failed: ' + (e?.message || String(e)));
    }
  };

  const generateKeyAndRequestMetadata = async () => {
    setStatus('Generating Ed25519 keypair...');
    try {
      // Generate Ed25519 keypair in-memory only. Do NOT persist private key in storage.
  const privateKeyBytes = ed.utils.randomSecretKey();
      const pub = await ed.getPublicKey(privateKeyBytes);
      const pubHex = bytesToHex(pub);
      setAccountPubKeyHex(pubHex);
      setStatus('Requesting SignedKeyRequestMetadata from backend...');

      // Send public key to backend to get SignedKeyRequestMetadata signed by app
      const resp = await fetch('/api/farcaster/signed-key-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyHex: pubHex }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        setStatus('Backend metadata request failed: ' + text);
        return;
      }
      const { metadataHex: meta } = await resp.json();
      // Keep metadata only in memory (component state) for later submission
      setMetadataHex(meta);

      // Offer the user the private key for safe offline storage. Do NOT persist it.
      const privHex = bytesToHex(privateKeyBytes);
      const blob = new Blob([privHex], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `triviacast_farcaster_account_key_${pubHex.slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Clear privateKeyBytes from memory as soon as practical (help GC by overwriting buffer)
      try {
        for (let i = 0; i < privateKeyBytes.length; i++) privateKeyBytes[i] = 0;
      } catch (_) {}

      setStatus('Received metadata. Private key downloaded to your device. Now collect blockchain signatures (Register & Add).');
    } catch (e: any) {
      setStatus('Error generating key / requesting metadata: ' + (e?.message || String(e)));
    }
  };

  const collectSignaturesAndSubmit = async () => {
  if (!address) { setStatus('Please connect wallet first'); return; }
  if (!metadataHex || !accountPubKeyHex) { setStatus('Missing metadata or generated key; please run the previous step'); return; }

    setStatus('Preparing signer helpers...');

    try {
      // Import hub helpers dynamically to avoid SSR issues
      const mod = await import('@farcaster/hub-nodejs');
      const { ViemWalletEip712Signer } = mod as any;

      // Create a wallet signer that uses the injected provider
      const walletSigner = new ViemWalletEip712Signer((window as any).ethereum);

      setStatus('Fetching nonces from backend...');
      // Ask backend for idRegistry and keyGateway nonces for this address
      const n1 = await fetch(`/api/farcaster/nonce?contract=idRegistry&address=${address}`);
      const { nonce: idNonce } = await n1.json();
      const n2 = await fetch(`/api/farcaster/nonce?contract=keyGateway&address=${address}`);
      const { nonce: keyNonce } = await n2.json();

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60); // 1 hour

      setStatus('Requesting Register signature from wallet...');
      const registerRes = await walletSigner.signRegister({
        to: address,
        recovery: '0x00000000FcB080a4D6c39a9354dA9EB9bC104cd7',
        nonce: idNonce,
        deadline,
      });
      if (!registerRes.isOk()) throw new Error('register signature failed');
      const registerSig = registerRes.value;

      setStatus('Requesting Add signature from wallet...');
      const addRes = await walletSigner.signAdd({
        owner: address,
        keyType: 1,
        key: accountPubKeyHex.startsWith('0x') ? accountPubKeyHex : '0x' + accountPubKeyHex,
        metadataType: 1,
        metadata: metadataHex,
        nonce: keyNonce,
        deadline,
      });
      if (!addRes.isOk()) throw new Error('add signature failed');
      const addSig = addRes.value;

      setStatus('Submitting signatures to backend for Bundler.register...');
      const payload = {
        to: address,
        recovery: '0x00000000FcB080a4D6c39a9354dA9EB9bC104cd7',
        registerSig: registerSig,
        signerParams: [{
          keyType: 1,
          key: accountPubKeyHex,
          metadataType: 1,
          metadata: metadataHex,
          sig: addSig,
          deadline: deadline.toString(),
        }],
        extraStorage: 0,
      };

      const reg = await fetch('/api/farcaster/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!reg.ok) {
        const text = await reg.text();
        setStatus('Registration failed: ' + text);
        return;
      }
      const result = await reg.json();
      setStatus('Registration submitted: ' + (result?.txHash || JSON.stringify(result)));
    } catch (e: any) {
      setStatus('Error during signature/submit: ' + (e?.message || String(e)));
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 bg-[var(--brain-pale)] rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">Create a Farcaster ID</h3>
      <p className="text-sm mb-4">This flow will ask your wallet to sign two EIP‑712 messages: one to register your address and one to add a Farcaster account key. The final on‑chain registration is performed by the backend (app pays the Bundler price).</p>
      <div className="flex gap-2 mb-3">
        <button className="bg-[var(--brain-accent)] text-white px-3 py-2 rounded" onClick={connectWallet}>Connect Wallet</button>
        <button className="bg-[var(--brain-accent)] text-white px-3 py-2 rounded" onClick={generateKeyAndRequestMetadata}>Generate Key & Request Metadata</button>
        <button className="bg-[var(--brain-accent)] text-white px-3 py-2 rounded" onClick={collectSignaturesAndSubmit}>Sign & Register</button>
      </div>
      <div className="text-xs text-[var(--text-medium)]">Connected: {address || 'not connected'}</div>
      <div className="text-xs text-[var(--text-medium)]">Account pubkey: {accountPubKeyHex || 'not generated'}</div>
  <div className="mt-2 text-xs text-yellow-700">Important: The Ed25519 private key is downloaded to your device only — it is not stored by this app. Keep it offline and secure. The app's private signing key (APP_PRIVATE_KEY) must remain on the server and is never sent to the browser.</div>
      <div className="mt-3 text-sm text-[var(--text-dark)]">Status: {status}</div>
    </div>
  );
}
