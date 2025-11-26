import React from "react";

type StakingWidgetProps = {
  poolName?: string;
  apr?: string | number;
  tvl?: string | number;
  isConnected?: boolean;
  onConnect?: () => void;
  onStake?: () => void;
  onUnstake?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * StakingWidget
 *
 * A self-contained React + TypeScript component that shows a compact staking UI.
 * It includes action links/buttons styled consistently. The Uniswap link labeled
 * "Deposit Liquidity" (https://app.uniswap.org/positions/v4/base/538435) is added
 * alongside the other links as requested.
 *
 * Usage:
 * <StakingWidget
 *   poolName="ABC / XYZ"
 *   apr="18.2%"
 *   tvl="$1.2M"
 *   isConnected={true}
 *   onConnect={() => { ... }}
 *   onStake={() => { ... }}
 *   onUnstake={() => { ... }}
 * />
 */
export default function StakingWidget({
  poolName = "LP Pool",
  apr = "—",
  tvl = "—",
  isConnected = false,
  onConnect,
  onStake,
  onUnstake,
  className = "",
  style,
}: StakingWidgetProps) {
  const uniswapUrl = "https://app.uniswap.org/positions/v4/base/538435";

  const rootStyles: React.CSSProperties = {
    width: 360,
    borderRadius: 12,
    padding: 16,
    background: "linear-gradient(180deg,#0f172a,#071028)",
    color: "#e6eef8",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    boxShadow: "0 6px 18px rgba(2,6,23,0.6)",
    ...style,
  };

  const headerStyles: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  };

  const titleStyles: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
    color: "#fff",
  };

  const metaStyles: React.CSSProperties = {
    display: "flex",
    gap: 8,
    flexDirection: "column",
    alignItems: "flex-end",
    fontSize: 13,
    color: "#9fb2cf",
  };

  const statsRow: React.CSSProperties = {
    display: "flex",
    gap: 12,
    marginBottom: 12,
  };

  const statBlock: React.CSSProperties = {
    flex: 1,
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    padding: "8px 10px",
    borderRadius: 8,
    textAlign: "center",
  };

  const actionsRow: React.CSSProperties = {
    display: "flex",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
    flexWrap: "wrap",
  };

  const linkButtonBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#e6eef8",
    fontWeight: 600,
    fontSize: 13,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
  };

  const primaryButton: React.CSSProperties = {
    ...linkButtonBase,
    background: "linear-gradient(180deg,#06b6d4,#0891b2)",
    border: "none",
    color: "white",
  };

  const ghostButton: React.CSSProperties = {
    ...linkButtonBase,
    background: "transparent",
  };

  return (
    <div className={className} style={rootStyles} role="region" aria-label="Staking widget">
      <div style={headerStyles}>
        <div>
          <h3 style={titleStyles}>{poolName}</h3>
          <div style={{ fontSize: 13, color: "#9fb2cf", marginTop: 6 }}>
            A compact interface for staking / LP actions
          </div>
        </div>
        <div style={metaStyles}>
          <div>APR: <strong style={{ color: "#fff" }}>{apr}</strong></div>
          <div>TVL: <strong style={{ color: "#fff" }}>{tvl}</strong></div>
        </div>
      </div>

      <div style={statsRow}>
        <div style={statBlock}>
          <div style={{ fontSize: 12, color: "#9fb2cf" }}>Your Stake</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>0.00</div>
        </div>
        <div style={statBlock}>
          <div style={{ fontSize: 12, color: "#9fb2cf" }}>Rewards</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>0.00</div>
        </div>
      </div>

      <div style={actionsRow}>
        {isConnected ? (
          <>
            <button
              type="button"
              onClick={onStake}
              style={primaryButton}
              aria-label="Stake"
            >
              Stake
            </button>

            <button
              type="button"
              onClick={onUnstake}
              style={ghostButton}
              aria-label="Unstake"
            >
              Unstake
            </button>

            {/* Existing links placed as styled anchors */}
            <a
              href="#/view"
              style={ghostButton}
              onClick={(e) => {
                // Example of internal navigation prevention for demo
                e.preventDefault();
                window.alert("Open view pool (replace with your navigation).");
              }}
              aria-label="View Pool"
            >
              View Pool
            </a>

            {/* NEW: Deposit Liquidity link — opens Uniswap positions in a new tab */}
            <a
              href={uniswapUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={ghostButton}
              aria-label="Deposit Liquidity"
              onClick={() => {
                // Optional tracking or analytics could be added here
              }}
            >
              Deposit Liquidity
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                style={{ marginLeft: 4 }}
              >
                <path
                  d="M14 3h7v7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 14L21 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 21H3V3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            style={primaryButton}
            aria-label="Connect wallet"
          >
            Connect Wallet
          </button>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#81a3c6" }}>
        Tip: Click "Deposit Liquidity" to open the Uniswap positions page in a new tab
        so you can add or adjust your LP position.
      </div>
    </div>
  );
}