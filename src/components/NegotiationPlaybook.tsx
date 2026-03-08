import { useState } from "react";
import type { NegotiationPlaybook } from "../utils/playbookGenerator";
import { formatPlaybookAsText } from "../utils/playbookGenerator";

interface NegotiationPlaybookProps {
  playbook: NegotiationPlaybook;
}

export function NegotiationPlaybook({ playbook }: NegotiationPlaybookProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = formatPlaybookAsText(playbook);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasContent = playbook.mustAddress.length > 0 || playbook.worthNegotiating.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="playbook-container">
      <div className="playbook-header">
        <h3 className="playbook-title">Negotiation Playbook</h3>
        <button
          type="button"
          onClick={handleCopy}
          className="playbook-copy-button"
          aria-label="Copy playbook to clipboard"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      <div className="playbook-content">
        {playbook.mustAddress.length > 0 && (
          <div className="playbook-section">
            <h4 className="playbook-section-title playbook-section-title--must-address">
              Must address before signing
            </h4>
            <ol className="playbook-list">
              {playbook.mustAddress.map((item, idx) => (
                <li key={idx} className="playbook-item">
                  <div className="playbook-item-issue">{item.issue}</div>
                  <div className="playbook-item-counter">
                    <strong>Counter-position:</strong> {item.counterPosition}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {playbook.worthNegotiating.length > 0 && (
          <div className="playbook-section">
            <h4 className="playbook-section-title playbook-section-title--worth-negotiating">
              Worth negotiating
            </h4>
            <ol className="playbook-list">
              {playbook.worthNegotiating.map((item, idx) => (
                <li key={idx} className="playbook-item">
                  <div className="playbook-item-issue">{item.issue}</div>
                  <div className="playbook-item-counter">
                    <strong>Counter-position:</strong> {item.counterPosition}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
