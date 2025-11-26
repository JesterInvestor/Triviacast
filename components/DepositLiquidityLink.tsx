import React from "react";

type DepositLiquidityLinkProps = {
  /**
   * The URL to open. Defaults to the provided Uniswap positions link.
   */
  url?: string;
  /**
   * Label text for the link. Defaults to "Deposit Liquidity".
   */
  label?: string;
  /**
   * If true, open in a new tab (default: true).
   */
  openInNewTab?: boolean;
  /**
   * Optional className to style the anchor from your app's CSS.
   */
  className?: string;
  /**
   * Inline style overrides.
   */
  style?: React.CSSProperties;
  /**
   * Optional click handler. If it returns false, navigation will be prevented.
   */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void | boolean;
};

const DEFAULT_URL = "https://app.uniswap.org/positions/v4/base/538435";

/**
 * DepositLiquidityLink
 *
 * A minimal, accessible React component that renders a simple link labeled
 * "Deposit Liquidity" which opens the Uniswap positions page.
 *
 * Example:
 * <DepositLiquidityLink />
 * <DepositLiquidityLink className="text-blue-500" />
 */
export default function DepositLiquidityLink({
  url = DEFAULT_URL,
  label = "Deposit Liquidity",
  openInNewTab = true,
  className,
  style,
  onClick,
}: DepositLiquidityLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (!onClick) return;
    const result = onClick(e);
    if (result === false) {
      e.preventDefault();
    }
  };

  return (
    <a
      href={url}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={className}
      style={style}
      onClick={handleClick}
      aria-label={label}
    >
      {label}
    </a>
  );
}