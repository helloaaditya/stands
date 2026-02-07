# View the game in a demo tool (before approving delivery)

Use one of these free hosts to run the game and get a **shareable link** so you can see it working without deploying the build yourself.

---

## Option A: Glitch (recommended)

1. Go to **[glitch.com](https://glitch.com)** and sign in (free account).
2. Click **New project** → **Import from GitHub**.
3. Enter your repo URL, e.g.  
   `https://github.com/helloaaditya/stands`  
   (use the same repo/branch you’re reviewing).
4. After the project is created, Glitch will run `npm install` and then start the app.
5. Click **Show** (top left) → **In a New Window** to open the live app.
6. **Share:** use the project URL (e.g. `https://your-project.glitch.me`) and send it for review.

**If the project doesn’t start automatically:** open **Tools** → **Logs** and check for errors. The start command is `npm start` (runs `node server.js`).

---

## Option B: Replit

1. Go to **[replit.com](https://replit.com)** and sign in.
2. Click **Create Repl** → **Import from GitHub**.
3. Paste your repo URL:  
   `https://github.com/helloaaditya/stands`
4. Choose **Node.js** as the environment and click **Import**.
5. After import, Replit will install dependencies. Click **Run** to start the server.
6. Replit will show a preview and a shareable URL (e.g. `https://replit.com/@username/stands`). Use **Open in new tab** to view the game and share that URL.

---

## Demo mode (no API needed)

If the external puzzle API isn’t configured, the server serves a **built-in demo puzzle** so the game still loads and is playable. You can:

- Play the demo puzzle
- Use timer, hints, themes, and navigation
- Submit a score (leaderboard may not persist without the real API)

Once you’re happy with the demo link, you can approve delivery. Fixing the Vercel (or other) build and wiring the real API can be the next step.

---

## After you have a link

- **Glitch:** `https://<your-project>.glitch.me`  
- **Replit:** Use the “Open in new tab” URL from the preview.

Send that link to whoever needs to approve so they can see the game without running the build locally.
