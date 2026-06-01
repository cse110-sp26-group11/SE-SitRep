# SE-SitRep

## Local GitHub OAuth Development

1. Install dependencies:
   ```sh
   npm install
   ```

2. Add `.dev.vars` in the project root:
   ```txt
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   GITHUB_ACCESS_TOKEN=...
   ```
   The client ID is public configuration. The client secret must stay server-side.
   `GITHUB_ACCESS_TOKEN` is optional and is only used for repository sync. It is
   required for private repositories and useful for higher GitHub API rate limits.

3. Initialize the local D1 database:
   ```sh
   npm run db:migrate:local
   npm run db:seed:local
   ```

4. Start the Cloudflare Worker:
   ```sh
   npx wrangler dev --local --port 8787
   ```

5. Open the frontend with Live Server:
   ```txt
   http://localhost:5500/src/index.html
   ```

6. Click **Sign in with GitHub**.

Important: use `localhost`, not `127.0.0.1`, unless the GitHub callback URL also uses `127.0.0.1`.
