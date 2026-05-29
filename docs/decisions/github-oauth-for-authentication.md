---
status: accepted
date: 2026-05-22
decision-makers: SE SitRep team
---

# Use GitHub OAuth for User Authentication

## Context and Problem Statement

Our application requires user authentication so that team members can log in, view their team's standups, and post status updates tied to their identity. We are deploying on Cloudflare Workers (see relevant ADR) with no traditional server or third-party auth SDK. Our users are software engineering students who already have GitHub accounts for the course. Which authentication mechanism should we use?

## Decision Drivers

- All target users already have GitHub accounts — it is a requirement of the course
- Must work within Cloudflare Workers (no Node.js-specific auth libraries like Passport.js)
- Must not require managing our own password storage, hashing, or credential recovery flows
- Should minimize onboarding friction — users should not need to create yet another account
- Must be implementable without adding a third-party auth dependency that requires TA approval

## Considered Options

1. GitHub OAuth (Authorization Code flow)
2. Email/password authentication (self-managed)
3. Magic link (passwordless email)
4. Third-party auth service (Auth0, Clerk, Supabase Auth)

## Decision Outcome

Chosen option: "GitHub OAuth", because every user in our target audience already has a GitHub account, it eliminates the need to manage credentials ourselves, and the OAuth flow can be implemented with standard fetch calls in Cloudflare Workers without any auth libraries.

### Consequences

- Good, because zero onboarding friction — users click "Sign in with GitHub" and authorize the app
- Good, because we never store or handle passwords, eliminating an entire class of security concerns
- Good, because the GitHub API gives us the user's username, avatar, and email, which we can use directly in the application without a separate profile setup step
- Good, because the OAuth flow is a well-documented standard that the team can learn and implement as a learning exercise
- Bad, because the OAuth Authorization Code flow requires a client secret, which must be stored securely as a Cloudflare Worker secret — not in the repository
- Bad, because if GitHub's OAuth service experiences downtime, our users cannot log in
- Bad, because the implementation requires understanding the OAuth redirect flow (authorization URL → callback → token exchange → API call), which has a learning curve

### Confirmation

Confirmation will occur when a user can click "Sign in with GitHub," be redirected to GitHub's authorization page, return to the application, and see their GitHub identity reflected in the UI with a valid session.

## Pros and Cons of the Options

### GitHub OAuth

Users authenticate via their existing GitHub account using the OAuth 2.0 Authorization Code flow.

- Good, because 100% of our target users already have GitHub accounts
- Good, because no password storage, hashing, or reset flows to implement
- Good, because GitHub provides user profile data (username, avatar, email) for free
- Good, because OAuth is an industry-standard protocol — implementing it is a valuable learning experience
- Good, because it can be implemented with vanilla `fetch` calls in Workers — no SDK needed
- Neutral, because we need to register a GitHub OAuth App, but this is free and straightforward
- Bad, because the client secret must be managed as a deployment secret, adding a configuration step
- Bad, because we are coupled to GitHub as an identity provider — if requirements change to support non-GitHub users, we would need to add another auth method

### Email/password authentication

Users create an account with an email and password that we store and validate.

- Good, because it works for any user regardless of external accounts
- Good, because the team has full control over the auth flow
- Bad, because we must implement secure password hashing (bcrypt/scrypt), which may not be available in the Workers runtime without a library
- Bad, because we must build password reset, email verification, and account recovery flows
- Bad, because storing credentials makes us responsible for protecting them — a security breach exposes user passwords
- Bad, because it adds significant onboarding friction for users who must create and remember another set of credentials

### Magic link (passwordless email)

Users enter their email, receive a one-time login link, and click it to authenticate.

- Good, because no passwords to store or manage
- Good, because it is a simple user experience
- Bad, because it requires a transactional email service (e.g., Mailgun, SendGrid), which is an external dependency requiring TA approval
- Bad, because email delivery is unreliable — messages can be delayed or filtered to spam
- Bad, because each login requires the user to check their email, which is slower than an OAuth redirect

### Third-party auth service (Auth0, Clerk, Supabase Auth)

Delegate authentication entirely to a managed auth platform.

- Good, because these services handle all auth complexity out of the box (login UI, session management, MFA)
- Good, because they are battle-tested and secure
- Bad, because they are external dependencies that require TA approval per course constraints
- Bad, because they typically require a client-side SDK, which conflicts with our vanilla JS, no-framework approach
- Bad, because they introduce a third-party service dependency beyond Cloudflare, adding a point of failure
- Bad, because the team learns less about authentication by delegating it entirely

## More Information

- [GitHub OAuth documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [OAuth 2.0 Authorization Code flow (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)
- Related ADR: Cloudflare Workers for Backend Compute
