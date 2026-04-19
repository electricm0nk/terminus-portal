import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import StatusIndicator from './StatusIndicator.jsx';
import { STATUS } from '../constants/status.js';

export default function ServiceCard({ service, status }) {
  const { tokens } = useTheme();
  const resolvedStatus =
    status !== undefined ? status : service.enabled ? STATUS.CHECKING : STATUS.NO_CHECK;
  const fallbackIcon = service.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const cardStyle = {
    background: tokens.bgCard,
    border: `1px solid ${tokens.border}`,
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontFamily: tokens.fontFamily,
    color: tokens.text,
    textDecoration: 'none',
    borderRadius: '14px',
    minHeight: '100%',
  };

  const content = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {service.iconSlug ? (
          <img
            src={`https://cdn.simpleicons.org/${service.iconSlug}`}
            alt={service.name}
            width={24}
            height={24}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              background: tokens.bgSurface,
              border: `1px solid ${tokens.border}`,
              color: tokens.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 'bold',
            }}
          >
            {fallbackIcon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <strong style={{ color: tokens.accent, display: 'block' }}>{service.name}</strong>
          <span style={{ color: tokens.textMuted, fontSize: '0.72rem' }}>
            {service.domain} / {service.service}
          </span>
        </div>
      </div>
      <span style={{ color: tokens.textMuted, fontSize: '0.85rem' }}>{service.description}</span>
      <span style={{ color: tokens.textMuted, fontSize: '0.75rem' }}>
        {service.category.toUpperCase()}
      </span>
      <StatusIndicator status={resolvedStatus} />
    </>
  );

  if (!service.enabled) {
    return (
      <div
        data-testid={`service-card-${service.id}`}
        tabIndex={-1}
        aria-disabled="true"
        style={{ ...cardStyle, borderStyle: 'dashed', borderColor: tokens.border }}
      >
        {content}
        <span style={{ color: tokens.textMuted, fontSize: '0.75rem' }}>PENDING</span>
      </div>
    );
  }

  return (
    <a
      data-testid={`service-card-${service.id}`}
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={service.name}
      style={cardStyle}
    >
      {content}
    </a>
  );
}
