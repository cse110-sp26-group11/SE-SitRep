const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// simulate the backend port
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'se-sitrep-api', database: 'reachable' });
});

// GitHub OAuth port — receive code，return token
app.post('/api/auth/github', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }
  
  // return the json format same as frontend
  res.json({
    token: 'mock-jwt-' + Date.now(),
    user: {
      id: 'user-alex',
      displayName: 'Alex Chen',
      initials: 'AC',
      githubUsername: 'alex-chen'
    }
  });
});

app.listen(8787, () => {
  console.log('Mock server on http://localhost:8787');
});