import { render, screen, within } from '@testing-library/react';
import React from 'react';
import ServiceGrid from '../../components/ServiceGrid.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => localStorage.clear());

const testServices = [
  { id: 'argocd', name: 'ArgoCD', description: 'GitOps', domain: 'Terminus', service: 'Platform', category: 'infra', url: 'https://a', iconSlug: 'argocd', healthCheck: { url: '', enabled: true }, enabled: true },
  { id: 'vault', name: 'Vault', description: 'Secrets', domain: 'Terminus', service: 'Platform', category: 'infra', url: 'https://b', iconSlug: 'vault', healthCheck: { url: '', enabled: true }, enabled: true },
  { id: 'ollama', name: 'Ollama', description: 'LLM', domain: 'Terminus', service: 'AI', category: 'ai', url: 'https://d', iconSlug: 'ollama', healthCheck: { url: '', enabled: true }, enabled: true },
  { id: 'fourdogs', name: 'Fourdogs', description: 'App', domain: 'Fourdogs', service: 'Central', category: 'app', url: '#', iconSlug: '', healthCheck: { url: '', enabled: false }, enabled: false },
];

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ServiceGrid grouping', () => {
  it('renders two Terminus sections when multiple services exist under the domain', () => {
    const { container } = wrap(<ServiceGrid services={testServices} statusMap={{}} />);
    const terminusSections = container.querySelectorAll('section[data-domain="terminus"]');
    expect(terminusSections).toHaveLength(2);
  });

  it('Terminus / Platform section contains ArgoCD and Vault', () => {
    const { container } = wrap(<ServiceGrid services={testServices} statusMap={{}} />);
    const platformSection = container.querySelector('section[data-domain="terminus"][data-service="platform"]');
    expect(within(platformSection).getByText('ArgoCD')).toBeInTheDocument();
    expect(within(platformSection).getByText('Vault')).toBeInTheDocument();
  });

  it('renders a separate Terminus / AI section when AI services exist', () => {
    const { container } = wrap(<ServiceGrid services={testServices} statusMap={{}} />);
    const aiSection = container.querySelector('section[data-domain="terminus"][data-service="ai"]');
    expect(aiSection).not.toBeNull();
    expect(within(aiSection).getByText('Ollama')).toBeInTheDocument();
  });

  it('maintains SERVICES order within each domain/service group', () => {
    const { container } = wrap(<ServiceGrid services={testServices} statusMap={{}} />);
    const platformSection = container.querySelector('section[data-domain="terminus"][data-service="platform"]');
    const names = Array.from(platformSection.querySelectorAll('[data-testid^="service-card-"]')).map(
      (el) => el.getAttribute('data-testid')
    );
    expect(names).toEqual(['service-card-argocd', 'service-card-vault']);
  });
});
