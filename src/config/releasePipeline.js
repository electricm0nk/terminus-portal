/**
 * releasePipeline.js — Release Pipeline tab repo configuration
 *
 * Each entry describes a repo tracked in the Release Pipeline tab.
 * The `branches` field defines which branch slugs are fetched from the sidecar.
 * A missing or null `dev` field means this repo has no active dev branch
 * and only the prod column is shown.
 *
 * To add a repo: append an entry with owner, repo, displayName, and branches.
 */

export const REPOS = [
  {
    owner: 'electricm0nk',
    repo: 'terminus-portal',
    displayName: 'Terminus Portal',
    branches: { dev: 'develop', prod: 'main' },
  },
  {
    owner: 'electricm0nk',
    repo: 'terminus.infra',
    displayName: 'Terminus Infra',
    branches: { dev: null, prod: 'main' },
  },
  {
    owner: 'electricm0nk',
    repo: 'terminus.platform',
    displayName: 'Terminus Platform',
    branches: { dev: null, prod: 'main' },
  },
  {
    owner: 'electricm0nk',
    repo: 'lens.config',
    displayName: 'Lens Config',
    branches: { dev: null, prod: 'main' },
  },
  {
    owner: 'electricm0nk',
    repo: 'fourdogs-central',
    displayName: 'Fourdogs Central',
    branches: { dev: 'develop', prod: 'main' },
  },
  {
    owner: 'electricm0nk',
    repo: 'fourdogs-central-ui',
    displayName: 'Fourdogs Central UI',
    branches: { dev: 'develop', prod: 'main' },
  },
  {
    owner: 'electricm0nk',
    repo: 'fourdogs-kaylee-agent',
    displayName: 'Kaylee Agent',
    branches: { dev: 'develop', prod: 'main' },
  },
  {
    owner: 'electricm0nk',
    repo: 'terminus-inference-gateway',
    displayName: 'Inference Gateway',
    branches: { dev: 'develop', prod: 'main' },
  },
  {
    owner: 'electricm0nk',
    repo: 'terminus-inference-qwen-warmup',
    displayName: 'Qwen Warmup',
    branches: { dev: null, prod: 'main' },
  },
];
