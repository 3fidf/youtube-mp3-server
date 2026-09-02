# YouTube -> MP3 server for music.html

This runs the actual conversion (via `yt-dlp` + `ffmpeg`) that the
"Convert" button in `music.html` calls. There are two ways to use it:

- **Deployed (recommended if you're sharing music.html with anyone else)**
  -- host this once at a public URL, point `music.html` at it, and every
  copy of the HTML file works with zero setup for whoever opens it.
  See `DEPLOY.md`.

- **Local (fine if it's just for you)** -- run it on your own machine
  each time you want to use the converter. See below.

## Running it locally

1. **Install Node.js**: https://nodejs.org
2. **Install yt-dlp** and make sure it's on your PATH:
   - Windows: `winget install yt-dlp.yt-dlp`
   - macOS: `brew install yt-dlp`
   - Linux: `pip install yt-dlp`
   - Check: `yt-dlp --version`
3. **Install ffmpeg**:
   - Windows: `winget install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Linux: your package manager (e.g. `apt install ffmpeg`)
   - Check: `ffmpeg -version`
4. **Install dependencies:**
   ```
   cd youtube-mp3-server
   npm install
   ```
5. **Run it:**
   ```
   node server.js
   ```
   Leave that terminal open, then open `music.html` -- as long as
   `CONVERTER_API` in the page still says `http://localhost:8787`
   (the default), it'll talk to this local server.

## Deploying it (so others don't need any of the above)

See `DEPLOY.md` for step-by-step instructions for Render or Railway.
Short version: deploy this folder, get a public URL back, then change
one line in `music.html` (`CONVERTER_API`) to that URL.

## Notes

- Converted files are saved in `youtube-mp3-server/downloads/` and are
  automatically deleted after 1 hour to avoid filling up disk space.
- There's a 20-minute video length limit built in (`MAX_DURATION_SECONDS`
  in `server.js`) -- raise or remove it if you need longer videos.
- If conversion fails, check the server's terminal/logs for the actual
  yt-dlp error. The most common fix is updating yt-dlp: `yt-dlp -U`
  (for a deployed instance, just redeploy -- the Dockerfile always grabs
  the latest release).
