const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = 3000;

const scopes = ['https://www.googleapis.com/auth/firebase.messaging'];

async function getAccessToken() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.client_email,
        private_key: process.env.private_key.replace(/\\n/g, '\n'),
      },
      scopes,
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error generating access token:', error);
    return null;
  }
}

app.get('/generate-token-misba', async (req, res) => {
  const token = await getAccessToken();
  if (token) {
    res.json({ access_token: token });
  } else {
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
