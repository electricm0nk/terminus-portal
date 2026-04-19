import { render, screen } from '@testing-library/react';
import React from 'react';
import ServiceCard from '../../components/ServiceCard.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => localStorage.clear());

const enabledService = {
  id: 'argocd',
  name: 'ArgoCD',
  description: 'GitOps continuous delivery',
  domain: 'Terminus',
  service: 'Platform',
  category: 'infra',
  url: 'https://argo.trantor.internal',
  iconSlug: 'argocd',
  healthCheck: { url: 'https://argo.trantor.internal/healthz', enabled: true },
  enabled: true,
};

const disabledService = {
  id: 'fourdogs',
  name: 'Fourdogs',
  description: 'Application services',
  domain: 'Fourdogs',
  service: 'Central',
  category: 'app',
  url: '#',
  iconSlug: '',
  healthCheck: { url: '', enabled: false },
  enabled: false,
};

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ServiceCard — enabled', () => {
  it('renders as <a> with href, target, rel', () => {
    wrap(<ServiceCard service={enabledService} />);
    const link = screen.getByRole('link', { name: /ArgoCD/i });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', enabledService.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays service name and description', () => {
    wrap(<ServiceCard service={enabledService} />);
    expect(screen.getByText('ArgoCD')).toBeInTheDocument();
    expect(screen.getByText('GitOps continuous delivery')).toBeInTheDocument();
  });

  it('icon img has non-empty alt attribute', () => {
    wrap(<ServiceCard service={enabledService} />);
    const img = screen.getByRole('img', { name: 'ArgoCD' });
    expect(img).toBeInTheDocument();
    expect(img.alt).toBeTruthy();
  });
});

describe('ServiceCard — disabled', () => {
  it('renders as <div>, not <a>', () => {
    wrap(<ServiceCard service={disabledService} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows PENDING indicator', () => {
    wrap(<ServiceCard service={disabledService} />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });
});
