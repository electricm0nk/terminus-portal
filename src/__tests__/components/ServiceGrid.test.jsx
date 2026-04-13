import { render, screen, within } from '@testing-library/react';
import React from 'react';
import ServiceGrid from '../../components/ServiceGrid.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => localStorage.clear());

const testServices = [
  { id: 'argocd', name: 'ArgoCD', description: 'GitOps', category: 'infra', url: 'https://a', iconSlug: 'argocd', healthCheck: { url: '', enabled: true }, enabled: true },
  { id: 'vault', name: 'Vault', description: 'Secrets', category: 'infra', url: 'https://b', iconSlug: 'vault', healthCheck: { url: '', enabled: true }, enabled: true },
  { id: 'pgadmin', name: 'pgAdmin', description: 'DB admin', category: 'data', url: 'https://c', iconSlug: 'postgresql', healthCheck: { url: '', enabled: true }, enabled: true },
  { id: 'ollama', name: 'Ollama', description: 'LLM', category: 'ai', url: 'https://d', iconSlug: 'ollama', healthCheck: { url: '', enabled: true }, enabled: true },
  { id: 'fourdogs', name: 'Fourdogs', description: 'App', category: 'app', url: '#', iconSlug: '', healthCheck: { url: '', enabled: false }, enabled: false },
];

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ServiceGrid grouping', () => {
  it('renders an INFRA section heading', () => {
    wrap(<ServiceGrid services={testServices} statusMap={{}} />);
    expect(screen.getByRole('heading', { name: /infrastructure/i })).toBeInTheDocument();
  });

  it('INFRA section contains ArgoCD and Vault', () => {
    const { container } = wrap(<ServiceGrid services={testServices} statusMap={{}} />);
    const infraSection = container.querySelector('section[data-category="infra"]');
    expect(within(infraSection).getByText('ArgoCD')).toBeInTheDocument();
    expect(within(infraSection).getByText('Vault')).toBeInTheDocument();
  });

  it('empty category produces no heading — no "platform" section', () => {
    wrap(<ServiceGrid services={testServices} statusMap={{}} />);
    expect(screen.queryByText(/platform/i)).toBeNull();
  });

  it('maintains SERVICES order within group', () => {
    const { container } = wrap(<ServiceGrid services={testServices} statusMap={{}} />);
    const infraSection = container.querySelector('section[data-category="infra"]');
    const names = Array.from(infraSection.querySelectorAll('[data-testid^="service-card-"]')).map(
      (el) => el.getAttribute('data-testid')
    );
    expect(names).toEqual(['service-card-argocd', 'service-card-vault']);
  });
});
