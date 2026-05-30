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
   ```
   The client ID is public configuration. The client secret must stay server-side.

3. Start the Cloudflare Worker:
   ```sh
   npx wrangler dev --local --port 8787
   ```

4. Open the frontend with Live Server:
   ```txt
   http://localhost:5500/src/index.html
   ```

5. Click **Sign in with GitHub**.

Important: use `localhost`, not `127.0.0.1`, unless the GitHub callback URL also uses `127.0.0.1`.
