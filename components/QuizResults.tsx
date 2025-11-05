import React, { useEffect, useState } from 'react';
import { shareResultsText, shareResultsUrl, openNativeShareFallback } from '../lib/farcaster';

type Props = {
  score: number;
  tPoints: number;
  onClose?: () => void;
  username?: string;
  autoOpenPreview?: boolean; // when true, show preview/modal on mount
};

export default function QuizResults({ score, tPoints, onClose, username, autoOpenPreview }: Props) {
  const [showPreview, setShowPreview] = useState<boolean>(!!autoOpenPreview);
  const text = shareResultsText(score, tPoints, username);

  useEffect(() => {
    if (autoOpenPreview) setShowPreview(true);
  }, [autoOpenPreview]);

  async function handleShare() {
    // Try native share first, fallback to web compose / open url
    await openNativeShareFallback(text);
    setShowPreview(false);
    if (onClose) onClose();
  }

  function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        // ignore errors
      });
    } else {
      // last-resort: create a textarea and copy
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // ignore
      }
    }
    setShowPreview(false);
    if (onClose) onClose();
  }

  function handleOpenCompose() {
    const url = shareResultsUrl(score, tPoints, username);
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowPreview(false);
    if (onClose) onClose();
  }

  return (
    <div className="quiz-results-root">
      <div className="quiz-results-summary">
        <p><strong>Score:</strong> {score}</p>
        <p><strong>T Points:</strong> {tPoints}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowPreview(true)}>Share</button>
        </div>
      </div>

      {showPreview && (
        <div
          className="qc-preview-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="qc-preview-card"
            style={{
              background: 'white',
              borderRadius: 8,
              width: 'min(720px, 95%)',
              padding: 16,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ marginTop: 0 }}>Share your result</h3>
            <textarea
              readOnly
              value={text}
              rows={4}
              style={{ width: '100%', borderRadius: 6, padding: 8, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button onClick={handleShare}>Cast / Share</button>
              <button onClick={handleOpenCompose}>Open Composer</button>
              <button onClick={handleCopy}>Copy</button>
              <button
                onClick={() => {
                  setShowPreview(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
