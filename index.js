const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
const projectId = process.env.project_id;

// 🔐 Get Firebase Access Token
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
    return token.token;
  } catch (error) {
    console.error('Error generating access token:', error);
    return null;
  }
}

// ✅ GET /generate-token-misba
app.get('/generate-token-misba', async (req, res) => {
  const token = await getAccessToken();
  if (token) {
    res.json({ access_token: token });
  } else {
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// ✅ POST /send-single-message
app.post('/send-single-message', async (req, res) => {
  const { token, title, body, image, link } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Missing required parameters: token, title, body' });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return res.status(500).json({ error: 'Failed to get access token' });

  const payload = {
    message: {
      token,
      notification: { title, body, image: image || undefined },
      webpush: {
        fcm_options: { link: link || undefined }
      }
    }
  };

  try {
    const response = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('FCM Send Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || 'Failed to send message',
    });
  }
});

// ✅ POST /send-multiple-messages
app.post('/send-multiple-messages', async (req, res) => {
  const { tokens, title, body, image, link } = req.body;

  if (!Array.isArray(tokens) || !title || !body) {
    return res.status(400).json({ error: "'tokens' must be an array and title/body are required" });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return res.status(500).json({ error: 'Failed to get access token' });

  const results = [];

  for (const token of tokens) {
    const payload = {
      message: {
        token,
        notification: { title, body, image: image || undefined },
        webpush: {
          fcm_options: { link: link || undefined }
        }
      }
    };

    try {
      const response = await axios.post(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      results.push({ token, httpCode: response.status, response: response.data });
    } catch (err) {
      results.push({
        token,
        httpCode: err.response?.status || 500,
        response: err.response?.data || 'Failed to send',
      });
    }
  }

  res.json({ results });
});

// Start the server
app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
