# Deploying the converter so end users don't need to install anything

This turns the local server into an always-on service at a public URL.
Once it's deployed, you update one line in `music.html` and anyone who
downloads just the HTML file gets a working converter -- no Node, no
yt-dlp, no setup on their end.

## Option A: Render (recommended, has a free tier)

1. Push this `youtube-mp3-server` folder to a GitHub repo (it can be its
   own repo, or a subfolder of a bigger one -- just note the path).
2. Go to https://dashboard.render.com → **New** → **Blueprint**.
3. Connect the repo. Render will detect `render.yaml` automatically and
   set everything up (Docker build, health check, etc.).
4. Click **Apply**. First build takes a few minutes (it's installing
   ffmpeg + yt-dlp in the container).
5. Once it's live, Render gives you a URL like
   `https://youtube-mp3-server-xxxx.onrender.com`.
6. Open `music.html`, find this line near the top of the "YouTube
   Converter Logic" script:
   ```js
   const CONVERTER_API = 'http://localhost:8787';
   ```
   Change it to your Render URL (no trailing slash):
   ```js
   const CONVERTER_API = 'https://youtube-mp3-server-xxxx.onrender.com';
   ```
7. Save and re-share `music.html`. It now works standalone.

**Free tier note:** Render's free web services spin down after 15
minutes of no traffic and take ~30-50 seconds to wake back up on the
next request. That means the first conversion after a while idle will
feel slow, then it's fast again. Upgrading to a paid instance removes
that delay if it matters to you.

## Option B: Railway (also has a free trial tier)

1. Push the folder to GitHub, same as above.
2. https://railway.app → **New Project** → **Deploy from GitHub repo**.
3. Railway auto-detects the `Dockerfile` and builds it.
4. In the service's **Settings → Networking**, click **Generate Domain**
   to get a public URL.
5. Update `CONVERTER_API` in `music.html` to that URL, same as step 6
   above.

## Keeping it running

Either host works the same way after deployment: your server stays up
(or spins up on request, on free tiers) at a fixed URL, and every copy
of `music.html` you hand out just points at it. You don't need to touch
the server again unless you want to update yt-dlp or change limits.

To update yt-dlp later (YouTube changes things periodically and older
yt-dlp versions break), just redeploy -- the Dockerfile always pulls the
latest yt-dlp release at build time.
