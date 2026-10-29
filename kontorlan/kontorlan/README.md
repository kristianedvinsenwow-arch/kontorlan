# KontorLAN – own server

The game plus a small server. Nobody needs a Claude account to play.

## Option A: Office network (LAN)

1. Install **Node.js** (LTS) from https://nodejs.org on one computer.
2. Unzip this folder on that computer.
3. Start the server:
   - Windows: double-click `start.bat`
   - Mac: double-click `start.command` (first time: right-click → Open)
4. The window shows two addresses. Open `http://localhost:8080` yourself, and give coworkers the
   `http://192.168.x.x:8080` address. Everyone must be on the same network.
5. If Windows asks about the firewall, click **Allow** (private networks).

Close the window to stop the server.

## Option B: On the internet with Render (free)

Render deploys from a GitHub repository, so the files go to GitHub first.

**GitHub**
1. Log in at https://github.com (create a free account if needed).
2. Click **+** (top right) → **New repository**. Name: `kontorlan`. Choose **Public**. Click **Create repository**.
3. On the next page click **uploading an existing file**.
4. Drag in everything from this folder **except `node_modules`**: `server.js`, `package.json`, `README.md`,
   `start.bat`, `start.command` and the whole `public` folder.
5. Click **Commit changes**.

**Render**
1. In the Render dashboard click **New +** → **Web Service**.
2. Choose **Build and deploy from a Git repository** → **Connect GitHub**, allow access, and pick `kontorlan`.
3. Fill in:
   - **Name:** `kontorlan`
   - **Region:** Frankfurt (EU Central)
   - **Branch:** `main`
   - **Runtime / Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. Click **Create Web Service** and wait for **Live** (a couple of minutes).
5. Your link is at the top, like `https://kontorlan.onrender.com`. Share it with anyone.

On the free plan the server sleeps after 15 minutes without players. The first visit after that takes
about a minute to wake it up; just wait and reload.

## Updating

Replace `public/index.html` (and any new files in `public/tex`) with the new version.
- LAN: restart the server.
- Render: upload the changed files to GitHub; Render redeploys automatically.
