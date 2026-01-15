import { Octokit } from 'octokit';

let octokit = null;

export function initGitHub(token) {
  octokit = new Octokit({ auth: token });
}

/**
 * Deploy a landing page to GitHub Pages
 * Creates/updates an HTML file in the repository
 */
export async function deployPage(owner, repo, slug, htmlContent, commitMessage = 'Deploy landing page') {
  if (!octokit) {
    throw new Error('GitHub not initialized. Call initGitHub first.');
  }

  const path = `${slug}/index.html`;

  // Check if file already exists to get its SHA (required for updates)
  let existingSha = null;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    existingSha = data.sha;
  } catch (error) {
    // File doesn't exist yet, that's fine
    if (error.status !== 404) {
      throw error;
    }
  }

  // Create or update the file
  const params = {
    owner,
    repo,
    path,
    message: commitMessage,
    content: Buffer.from(htmlContent).toString('base64'),
    branch: 'main',
  };

  if (existingSha) {
    params.sha = existingSha;
  }

  const { data } = await octokit.rest.repos.createOrUpdateFileContents(params);

  return {
    commitSha: data.commit.sha,
    htmlUrl: data.content.html_url,
  };
}

/**
 * Delete a landing page from GitHub Pages
 */
export async function deletePage(owner, repo, slug) {
  if (!octokit) {
    throw new Error('GitHub not initialized. Call initGitHub first.');
  }

  const path = `${slug}/index.html`;

  // Get file SHA (required for deletion)
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  await octokit.rest.repos.deleteFile({
    owner,
    repo,
    path,
    message: `Delete landing page: ${slug}`,
    sha: data.sha,
    branch: 'main',
  });

  return { deleted: true };
}

/**
 * Initialize the repository for GitHub Pages if needed
 */
export async function ensureRepoExists(owner, repo) {
  if (!octokit) {
    throw new Error('GitHub not initialized. Call initGitHub first.');
  }

  try {
    await octokit.rest.repos.get({ owner, repo });
    return { exists: true, created: false };
  } catch (error) {
    if (error.status === 404) {
      // Create the repository
      await octokit.rest.repos.createForAuthenticatedUser({
        name: repo,
        description: 'Unicorn Marketers Landing Pages',
        homepage: `https://${owner}.github.io/${repo}`,
        private: false,
        has_issues: false,
        has_projects: false,
        has_wiki: false,
        auto_init: true,
      });

      // Wait a moment for GitHub to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Enable GitHub Pages
      try {
        await octokit.rest.repos.createPagesSite({
          owner,
          repo,
          source: {
            branch: 'main',
            path: '/',
          },
        });
      } catch (pagesError) {
        // Pages might already be enabled or need manual setup
        console.log('GitHub Pages setup note:', pagesError.message);
      }

      return { exists: true, created: true };
    }
    throw error;
  }
}

/**
 * Get the GitHub Pages URL for a repository
 */
export async function getPagesUrl(owner, repo) {
  if (!octokit) {
    throw new Error('GitHub not initialized. Call initGitHub first.');
  }

  try {
    const { data } = await octokit.rest.repos.getPages({ owner, repo });
    return data.html_url;
  } catch (error) {
    // Fallback to standard URL format
    return `https://${owner}.github.io/${repo}`;
  }
}

/**
 * Configure a custom domain for GitHub Pages
 */
export async function setCustomDomain(owner, repo, domain) {
  if (!octokit) {
    throw new Error('GitHub not initialized. Call initGitHub first.');
  }

  // Create/update CNAME file
  const path = 'CNAME';

  let existingSha = null;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    existingSha = data.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const params = {
    owner,
    repo,
    path,
    message: `Set custom domain: ${domain}`,
    content: Buffer.from(domain).toString('base64'),
    branch: 'main',
  };

  if (existingSha) {
    params.sha = existingSha;
  }

  await octokit.rest.repos.createOrUpdateFileContents(params);

  // Update Pages settings
  await octokit.rest.repos.updateInformationAboutPagesSite({
    owner,
    repo,
    cname: domain,
    https_enforced: true,
  });

  return { domain, configured: true };
}
