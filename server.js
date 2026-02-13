const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

loadEnv();

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=UTF-8',
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && parsedUrl.pathname === '/api/chat') {
    return handleChat(req, res);
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(parsedUrl.pathname, req.method, res);
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' }).end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`LoganValentinesDay server listening on http://localhost:${PORT}`);
});

function serveStatic(requestPath, method, res) {
  let filePath = path.join(ROOT_DIR, decodeURIComponent(requestPath));
  if (requestPath === '/' || requestPath === '') {
    filePath = path.join(ROOT_DIR, 'index.html');
  }
  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=31536000',
    });

    if (method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.end());
    stream.pipe(res);
  });
}

async function handleChat(req, res) {
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({
      error: 'Missing GEMINI_API_KEY in environment',
    }));
    return;
  }

  try {
    const body = await readRequestBody(req);
    const prompt = (body?.prompt || '').trim();
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!prompt) {
      res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        error: 'Prompt is required',
      }));
      return;
    }

    const reply = await fetchGeminiReply(history, prompt);

    res.writeHead(200, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({ reply })
    );
  } catch (error) {
    console.error('AI error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({ error: 'AI request failed' })
    );
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function fetchGeminiReply(history, prompt) {
  const instructions = `You are David writing lovingly to Logan. You've been together 3+ years. Logan is at Emory Med School studying to be a dermatologist. You both love sushi (especially spicy tuna rolls), you dream of going to Japan, you've traveled to Switzerland (paragliding), Seattle (hiking), and Barcelona (clubbing). You want a dachshund together. Tonight is Valentine's Day and you're doing cooking + wine + pottery. Keep responses under 120 words, warm, romantic, playful, and grounded in these real details.`;

  const contents = [];
  history
    .slice(-8)
    .filter((entry) => entry?.text)
    .forEach((entry) => {
      const role = entry.role === 'assistant' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: entry.text }] });
    });

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        role: 'system',
        parts: [{ text: instructions }],
      },
      contents,
      generationConfig: {
        temperature: 0.9,
        topP: 0.9,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error: ${errText}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0]?.content?.parts || [];
  const text = candidate.map((part) => part?.text || '').join(' ').trim();
  return text || "I’m thinking about you so much that my words got shy. Try again?";
}

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    const value = rest.join('=').trim();
    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  });
}
