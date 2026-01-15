import { Octokit } from 'octokit';

let octokit = null;

export function getOctokit() {
  if (!octokit && process.env.GITHUB_TOKEN) {
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }
  return octokit;
}

export async function deployPage(slug, htmlContent, commitMessage = 'Deploy landing page') {
  const kit = getOctokit();
  if (!kit) throw new Error('GitHub not configured');

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = `${slug}/index.html`;

  let existingSha = null;
  try {
    const { data } = await kit.rest.repos.getContent({ owner, repo, path });
    existingSha = data.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const params = {
    owner,
    repo,
    path,
    message: commitMessage,
    content: Buffer.from(htmlContent).toString('base64'),
    branch: 'main',
  };

  if (existingSha) params.sha = existingSha;

  const { data } = await kit.rest.repos.createOrUpdateFileContents(params);

  return {
    commitSha: data.commit.sha,
    htmlUrl: data.content.html_url,
  };
}

export async function deletePage(slug) {
  const kit = getOctokit();
  if (!kit) throw new Error('GitHub not configured');

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = `${slug}/index.html`;

  const { data } = await kit.rest.repos.getContent({ owner, repo, path });

  await kit.rest.repos.deleteFile({
    owner,
    repo,
    path,
    message: `Delete landing page: ${slug}`,
    sha: data.sha,
    branch: 'main',
  });

  return { deleted: true };
}

export async function ensureRepoExists() {
  const kit = getOctokit();
  if (!kit) throw new Error('GitHub not configured');

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  try {
    await kit.rest.repos.get({ owner, repo });
    return { exists: true, created: false };
  } catch (error) {
    if (error.status === 404) {
      await kit.rest.repos.createForAuthenticatedUser({
        name: repo,
        description: 'Unicorn Marketers Landing Pages',
        homepage: `https://${owner}.github.io/${repo}`,
        private: false,
        auto_init: true,
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { exists: true, created: true };
    }
    throw error;
  }
}
