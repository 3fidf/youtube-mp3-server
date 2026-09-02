// YouTube -> MP3 conversion server.
//
// Deployable to a free host (Render, Railway, etc.) via the included
// Dockerfile, so music.html can work for anyone who just downloads the
// HTML file -- no local install required on their end. It can also still
// be run locally exactly as before (see LOCAL_SETUP.md).
//
// The conversion itself is done with yt-dlp + ffmpeg, which must be
// present in the runtime environment. The Dockerfile installs both.

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = process.env.PORT || 8787;
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const MAX_DURATION_SECONDS = 20 * 60; // reject anything longer than 20 min
const FILE_TTL_MS = 60 * 60 * 1000;   // delete converted files after 1 hour

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

const app = express();
app.use(cors()); // any page can call this -- it's meant to be public
app.use(express.json());

// Serve finished MP3s so the page can play/download them directly.
app.use('/files', express.static(DOWNLOAD_DIR));

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/convert', (req, res) => {
  const url = (req.body && req.body.url || '').trim();

  if (!/^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts|embed|live)|youtu\.be\/)/.test(url)) {
    return res.status(400).json({ error: 'That does not look like a valid YouTube URL.' });
  }

  const id = crypto.randomBytes(8).toString('hex');
  const outputTemplate = path.join(DOWNLOAD_DIR, `${id}-%(title)s.%(ext)s`);

  const ytdlp = spawn('yt-dlp', [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--no-playlist',
    '--restrict-filenames',
    '--match-filter', `duration <= ${MAX_DURATION_SECONDS}`,
    // The web client requires a proof-of-origin token that yt-dlp can't
    // produce from a plain server request, which is what triggers
    // "Sign in to confirm you're not a bot" on datacenter IPs like
    // Render's. The android/tv clients don't require that token.
    '--extractor-args', 'youtube:player_client=android,tv',
    '--js-runtimes', 'node',
    '--print', 'after_move:filepath',
    '-o', outputTemplate,
    url,
  ]);

  let stdout = '';
  let stderr = '';
  ytdlp.stdout.on('data', (d) => { stdout += d.toString(); });
  ytdlp.stderr.on('data', (d) => { stderr += d.toString(); });

  ytdlp.on('error', (err) => {
    // Usually means yt-dlp isn't installed / not on PATH.
    res.status(500).json({
      error: 'Could not run yt-dlp on the server. (' + err.message + ')',
    });
  });

  ytdlp.on('close', (code) => {
    if (code !== 0) {
      console.error(stderr);
      const tooLong = /does not pass filter/i.test(stderr);
      // TEMP: surfacing the real yt-dlp error to the client for debugging.
      // Once things are working reliably, you can put back the generic
      // 'Conversion failed. See server logs for details.' message instead
      // if you don't want internal errors visible to whoever uses this.
      const lastLine = stderr.trim().split('\n').filter(Boolean).pop() || '(no output)';
      return res.status(500).json({
        error: tooLong
          ? `Video is longer than the ${MAX_DURATION_SECONDS / 60}-minute limit.`
          : `yt-dlp error: ${lastLine}`,
      });
    }

    const filePath = stdout.trim().split('\n').filter(Boolean).pop();
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'yt-dlp finished but no output file was found.' });
    }

    const filename = path.basename(filePath);
    // Strip the random id prefix and extension for a clean display title.
    const title = filename.replace(/^[a-f0-9]{16}-/, '').replace(/\.mp3$/i, '');

    // Build the file URL from the incoming request so it works whether
    // this is running on localhost or a public hosted domain.
    const base = `${req.protocol}://${req.get('host')}`;

    res.json({
      title,
      filename,
      url: `${base}/files/${encodeURIComponent(filename)}`,
    });
  });
});

// Periodically clean up old converted files so disk doesn't fill up when
// this is running as a shared, always-on service.
function cleanupOldFiles() {
  fs.readdir(DOWNLOAD_DIR, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach((file) => {
      const filePath = path.join(DOWNLOAD_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > FILE_TTL_MS) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}
setInterval(cleanupOldFiles, 10 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YouTube -> MP3 server running on port ${PORT}`);
});
