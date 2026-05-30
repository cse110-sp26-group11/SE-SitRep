import { jsonResponse, errorResponse } from '../lib/responses.js';

/**
 * Exchange authorization code for GitHub access token
 * @param {string} code - GitHub OAuth authorization code
 * @param {object} env - Environment variables
 * @returns {Promise<object>} GitHub access token response
 */
async function exchangeCodeForToken(code, env) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch GitHub user information
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<object>} GitHub user data
 */
async function fetchGitHubUser(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub user fetch failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a session token (you can implement JWT or simple session)
 * @param {object} user - GitHub user data
 * @returns {string} Session token
 */
function createSessionToken(user) {
  // Simple session creation - in production, use proper JWT signing
  const sessionData = {
    githubId: user.id,
    username: user.login,
    email: user.email,
    createdAt: Date.now(),
  };
  
  // For now, return base64 encoded data
  // TODO: Replace with proper JWT signing
  return btoa(JSON.stringify(sessionData));
}

/**
 * Handle GitHub OAuth authentication
 * @param {Request} request - HTTP request
 * @param {object} env - Environment variables
 * @returns {Promise<Response>}
 */
export async function handleGithubAuth(request, env) {
  try {
    // Parse request body
    const body = await request.json();
    const { code } = body;

    // Validate required fields
    if (!code) {
      return errorResponse('Missing authorization code', 400);
    }

    // Validate environment variables
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      console.error('GitHub OAuth credentials not configured');
      return errorResponse('OAuth configuration error', 500);
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code, env);
    
    if (tokenData.error) {
      return errorResponse(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`, 400);
    }

    // Fetch user info from GitHub
    const userData = await fetchGitHubUser(tokenData.access_token);

    // Create session token
    const sessionToken = createSessionToken(userData);

    // Return success response with user data and session token
    return jsonResponse({
      success: true,
      user: {
        githubId: userData.id,
        username: userData.login,
        name: userData.name || userData.login,
        email: userData.email,
        avatarUrl: userData.avatar_url,
      },
      sessionToken: sessionToken,
    });

  } catch (error) {
    console.error('GitHub auth error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}