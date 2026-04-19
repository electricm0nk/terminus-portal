import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import ServiceCard from './ServiceCard.jsx';

const SECTION_ORDER = ['Terminus::Platform', 'Terminus::AI', 'Fourdogs::Central'];

export default function ServiceGrid({ services, statusMap = {} }) {
  const { tokens } = useTheme();

  const grouped = services.reduce((acc, service) => {
    const key = `${service.domain}::${service.service}`;
    acc[key] = [...(acc[key] || []), service];
    return acc;
  }, {});

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem',
      }}
    >
      {[...SECTION_ORDER, ...Object.keys(grouped).filter((key) => !SECTION_ORDER.includes(key))]
        .filter((key) => grouped[key]?.length > 0)
        .map((key) => {
          const [domain, service] = key.split('::');
          return (
        <section
          key={key}
          data-domain={domain.toLowerCase()}
          data-service={service.toLowerCase()}
          style={{
            marginBottom: 0,
            background: tokens.bgSurface,
            border: `1px solid ${tokens.border}`,
            borderRadius: '18px',
            padding: '1rem',
          }}
        >
          <h2
            style={{
              color: tokens.accent,
              fontFamily: tokens.fontFamily,
              borderBottom: `1px solid ${tokens.border}`,
              paddingBottom: '0.55rem',
              marginBottom: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '1rem',
            }}
          >
            <span>{domain}</span>
            <span style={{ color: tokens.textMuted, fontSize: '0.8rem' }}>{service}</span>
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
            }}
          >
            {grouped[key].map((s) => (
              <ServiceCard key={s.id} service={s} status={statusMap[s.id] ?? null} />
            ))}
          </div>
        </section>
          );
        })}
    </div>
  );
}
