"use client";

import { useState, useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Detect if user is on mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || '';
      const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(mobile);
    };
    checkMobile();
  }, []);

  // Don't use wagmi hooks until mounted
  const { connectors, connect, isPending } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    // Close modal when connected
    if (isConnected) {
      onClose();
    }
  }, [isConnected, onClose]);

  if (!isMounted || !isOpen) return null;

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector });
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  // Map connector IDs to user-friendly names
  const getConnectorName = (connector: any) => {
    const id = connector.id?.toLowerCase() || '';
    const name = connector.name?.toLowerCase() || '';
    
    if (id.includes('farcaster') || name.includes('farcaster')) {
      return 'Farcaster Wallet';
    }
    if (id.includes('coinbase') || name.includes('coinbase')) {
      return 'Base Wallet (Coinbase)';
    }
    if (id.includes('metamask')) {
      return 'MetaMask';
    }
    if (id.includes('walletconnect')) {
      return 'WalletConnect';
    }
    return connector.name;
  };

  const getConnectorDescription = (connector: any) => {
    const id = connector.id?.toLowerCase() || '';
    const name = connector.name?.toLowerCase() || '';
    
    if (id.includes('farcaster') || name.includes('farcaster')) {
      return isMobile ? 'Sign in with your Farcaster mobile wallet' : 'Sign in with Farcaster miniapp';
    }
    if (id.includes('coinbase') || name.includes('coinbase')) {
      return 'Sign in with Base Wallet';
    }
    if (id.includes('metamask')) {
      return isMobile ? 'Sign in with MetaMask mobile' : 'Sign in with MetaMask extension';
    }
    if (id.includes('walletconnect')) {
      return 'Connect any wallet with WalletConnect';
    }
    return '';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          maxWidth: '400px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d1b2e', marginBottom: '0.5rem' }}>
            Sign In
          </h2>
          {isMobile && (
            <div style={{
              backgroundColor: '#FFE4EC',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#5a3d5c',
            }}>
              📱 Mobile detected - Choose your preferred wallet
            </div>
          )}
          <p style={{ fontSize: '0.875rem', color: '#5a3d5c' }}>
            Choose a wallet to connect and start playing
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isPending}
              style={{
                padding: '1rem',
                backgroundColor: '#FFE4EC',
                border: '2px solid #F4A6B7',
                borderRadius: '0.75rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                opacity: isPending ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isPending) {
                  e.currentTarget.style.backgroundColor = '#FFC4D1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFE4EC';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#2d1b2e', fontSize: '1rem', marginBottom: '0.25rem' }}>
                {getConnectorName(connector)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#5a3d5c' }}>
                {getConnectorDescription(connector)}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '0.75rem',
            backgroundColor: 'transparent',
            border: '1px solid #ddd',
            borderRadius: '0.5rem',
            color: '#5a3d5c',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
