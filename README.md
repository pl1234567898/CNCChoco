# FactoryPiCNC
Pi to CNC connection


# .env Cheat Sheet 
🔧 .env Cheat Sheet (Configuration Guide)
This project uses a .env file to configure runtime settings for the prox engine, CNC connectivity, and engraving defaults.
Node.js automatically loads this file at startup via:
JavaScriptrequire('dotenv').config();Show more lines
You do not commit .env to GitHub.
You do commit .env.example so others know what variables are required.

📌 1. How to create your .env
From the project root:

cp .env.example .env
nano .envShow more lines

Edit the values as needed.
Restart your server after changes:

node server.js
 OR
 pm2 restart prox

⚙️ 2. .env Variables Explained

Server Settings

Port = 3000

Database Settings

DB_FILE = ./data/prox.db

CNC Settings

CNC_PORT = /dev/ttyUSB0
CNC_BAUD = 115200
CNC_DRY_RUN = 1 (no CNC commands sent) or 0 (Real engraving)

G-code defaults
Safe_Z = 5 (lift heigt in mm)
Cut_Z = -1 (engraving depth in mm)
Feed_XY = 300 (XY Feed speed (mm/min)
Feed_Z = 100 (Z plunge speed (mm/min)


🧪 3. Testing your .env
Check if your .env is loading:

node -e "console.log(process.env)"Show more lines

Expected output includes:

PORT
DB_FILE
CNC_DRY_RUN
machining defaults

If you don’t see your variables → the .env file is in the wrong folder or missing.

🔐 4. Git Ignore Settings
Ensure your repo has:

.env
data/*.db

This keeps secrets and physical machine data out of Git.

🔁 5. When do I need to restart the server?
Any time you change:

CNC port
DRY_RUN flag
feed rates
Z depths
DB file path
port number

Restart your process.
If using Node:

ctrl+cnode 
server.js

If using PM2:

pm2 restart prox

🛠️ 6. Troubleshooting
CNC Not responding?

Check .env:

CNC_PORT=/dev/ttyUSB0
CNC_DRY_RUN=0

Confirm device:

ls /dev/ttyUSB

Add user to serial group:

sudo usermod -a -G dialout $USERShow more lines

G-code looks wrong?

Increase charHeight
Adjust originX / originY
Decrease CUT_Z (shallower)
Increase FEED_Z → faster plunge

DB not updating?

Verify DB_FILE path exists
Ensure you created the data/ folder:

mkdir -p data
