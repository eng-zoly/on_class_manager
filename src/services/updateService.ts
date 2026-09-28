export interface AppReleaseInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  htmlUrl: string;
  assetName: string;
  assetSize?: number;
}

export const getUpdateConfig = () => {
  const savedOwner = localStorage.getItem('classmanager_github_owner');
  const savedRepo = localStorage.getItem('classmanager_github_repo');
  return {
    owner: savedOwner || 'eng-zoly',
    repo: savedRepo || 'on_class_manager'
  };
};

export const saveUpdateConfig = (owner: string, repo: string) => {
  localStorage.setItem('classmanager_github_owner', owner.trim());
  localStorage.setItem('classmanager_github_repo', repo.trim());
};

/**
 * Compare two semver strings (e.g. "1.0.1" vs "1.0.0")
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export const compareVersions = (v1: string, v2: string): number => {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();
  
  const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

export const APP_VERSION = '1.0.1';

/**
 * Check for updates against GitHub Releases API
 */
export const checkForAppUpdates = async (currentVersion: string = APP_VERSION): Promise<AppReleaseInfo> => {
  const { owner, repo } = getUpdateConfig();
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`រកមិនឃើញ Releases នៅលើ GitHub Repo "${owner}/${repo}" ឡើយ។ សូមប្រាកដថា Repository នេះជា Public ឬមាន Release រួចរាល់។`);
    }
    throw new Error(`មិនអាចភ្ជាប់ទៅកាន់ GitHub API បានទេ (HTTP ${response.status})`);
  }

  const data = await response.json();
  const latestTag = (data.tag_name || data.name || '').replace(/^v/i, '').trim();
  const isNewer = compareVersions(latestTag, currentVersion) > 0;

  // Find best download asset (for Mac .dmg, or Win .exe)
  let downloadUrl = data.html_url;
  let assetName = 'GitHub Release Page';
  let assetSize = 0;

  if (Array.isArray(data.assets) && data.assets.length > 0) {
    const dmgAsset = data.assets.find((a: any) => typeof a.name === 'string' && a.name.endsWith('.dmg'));
    const exeAsset = data.assets.find((a: any) => typeof a.name === 'string' && a.name.endsWith('.exe'));
    const chosen = dmgAsset || exeAsset || data.assets[0];
    if (chosen) {
      downloadUrl = chosen.browser_download_url;
      assetName = chosen.name;
      assetSize = chosen.size;
    }
  }

  return {
    hasUpdate: isNewer,
    currentVersion,
    latestVersion: latestTag || currentVersion,
    releaseName: data.name || data.tag_name || `Version ${latestTag}`,
    releaseNotes: data.body || 'មិនមានកំណត់សម្គាល់ការកែប្រែ (No release notes provided)',
    publishedAt: data.published_at || new Date().toISOString(),
    downloadUrl,
    htmlUrl: data.html_url,
    assetName,
    assetSize
  };
};

export const formatBytes = (bytes: number, decimals = 1): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatSpeed = (bytesPerSec: number): string => {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  return `${formatBytes(bytesPerSec, 1)}/s`;
};
