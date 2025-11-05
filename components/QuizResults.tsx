import React, { useState, useEffect } from 'react';
import { shareResultsText, openNativeShareFallback } from '../lib/farcaster';

type Props = {
  score: number;
  tPoints: number;
  onClose?: () => void;
  username?: string; // optional username from lookup page
  // autoOpenPreview indicates the component should open a preview/confirm modal once results appear
  autoOpenPreview?: boolean;
};

export default function QuizResults({ score, tPoints, onClose, username, autoOpenPreview }: Props) {
  const [showPreview, setShowPreview] = useState<boolean>(!!autoOpenPreview);

  // if the parent toggles autoOpenPreview after mount we want to open the preview
  useEffect(() => {
    if (autoOpenPreview) setShowPreview(true);
  }, [autoOpenPreview]);

  const text = shareResultsText(score, tPoints, username);

  async function handleShare() {
    // Use the unified helper to open native share or fallback to web composer
    await openNativeShareFallback(text);
    setShowPreview(false);
    if (onClose) onClose();
  }

  function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        // ignore
      });
    }
    setShowPreview(false);
    if (onClose) onClose();
  }

  return (
    <div className="quiz-results-root">
      <div className="summary">
        <p>Your score: {score}</p>
        <p>T Points: {tPoints}</p>
        <button onClick={() => setShowPreview(true)}>Share</button>
      </div>

      {showPreview && (
        <div className="preview-modal" role="dialog" aria-modal="true">
          <div className="preview-content">
            <h3>Share your result</h3>
            <textarea readOnly value={text} rows={3} />
            <div className="preview-actions">
              <button onClick={handleShare}>Cast / Share</button>
              <button onClick={handleCopy}>Copy</button>
              <button onClick={() => setShowPreview(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
