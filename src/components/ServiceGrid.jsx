import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import ServiceCard from './ServiceCard.jsx';

const CATEGORY_ORDER = ['infra', 'platform', 'data', 'ai', 'app'];

const CATEGORY_LABELS = {
  infra: 'INFRASTRUCTURE',
  platform: 'PLATFORM',
  data: 'DATA',
  ai: 'AI',
  app: 'APPLICATIONS',
};

export default function ServiceGrid({ services, statusMap = {} }) {
  const { tokens } = useTheme();

  const grouped = services.reduce((acc, s) => {
    acc[s.category] = [...(acc[s.category] || []), s];
    return acc;
  }, {});

  return (
    <div>
      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
        <section key={cat} data-category={cat} style={{ marginBottom: '2rem' }}>
          <h2
            style={{
              color: tokens.accent,
              fontFamily: tokens.fontFamily,
              borderBottom: `1px solid ${tokens.border}`,
              paddingBottom: '0.4rem',
              marginBottom: '1rem',
            }}
          >
            {CATEGORY_LABELS[cat] || cat.toUpperCase()}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {grouped[cat].map((s) => (
              <ServiceCard key={s.id} service={s} status={statusMap[s.id] ?? null} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
