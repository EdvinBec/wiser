# wiser — deployment

Handover notes for setting this up on the server laptop. Written on the Windows machine where
the code was prepared; bring this file (it is in the repo) and start at **Part 2**.

---

## 1. What this is, in one screen

A timetable for UM FERI students. A student picks subjects — from any programme and year — and
for each one picks their group where the exercises split. The result is their own timetable.

**Where the data comes from.** Not from a database we fill, and no longer from scraping with a
browser. The backend reads the published Wise Timetable web layer over plain HTTP
(`wise-tt.com/web/feri/`), parses its iCalendar feed, and caches it. The browser cannot call
Wise directly — it sends no CORS headers — so everything goes through our backend.

**Request path in production**

```
 internet → tunnel → frontend container (nginx, 127.0.0.1:8080)
                        ├── /                      static SPA build
                        └── /api /auth /user       proxy → backend:5013
                                                            └── database:5432
```

Page and API share one origin, so the browser issues no cross-origin request and there is no
CORS to keep in step with the domain. Only the frontend port is published, and only on
loopback: the tunnel is the single way in.

**What the database holds.** User accounts and each user's subject selections. That is all, and
it is the only thing that cannot be rebuilt — timetable data is re-read from Wise on demand.

---

## 2. Before you touch the laptop

Have these ready; three of them cannot be generated on the machine.

| What | Where from |
|---|---|
| Domain name | the one you bought |
| Google OAuth client ID + secret | Google Cloud console, see §5 |
| Tunnel credentials | Cloudflare (or whichever tunnel you chose) |

Generate the rest on the laptop with `openssl` — §4 says when.

---

## 3. Laptop base setup

Linux Mint. Everything below is one-time.

### 3.1 SSH in from Windows

On the **laptop**:

```bash
sudo apt update && sudo apt install -y openssh-server
sudo systemctl enable --now ssh
ip addr show | grep 'inet '          # note the LAN address
```

On **Windows** (PowerShell), create a key if you have none and copy it over:

```powershell
ssh-keygen -t ed25519 -C "windows-$env:USERNAME"
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh USER@LAPTOP_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
ssh USER@LAPTOP_IP                    # should not ask for a password
```

Once key login works, turn passwords off on the laptop — `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PermitRootLogin no
```

```bash
sudo systemctl restart ssh
```

**Reaching it from outside the house.** Do not forward port 22 on the router. Either run SSH
through the same tunnel provider, or put both machines on a Tailscale network — then
`ssh user@laptop-name` works from anywhere with no open ports at all. Decide this when we set
up the tunnel; it changes nothing in the repo.

### 3.2 Keep it awake

A laptop lid suspends by default, which takes the site down.

```bash
sudo sed -i 's/^#*HandleLidSwitch=.*/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^#*HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

### 3.3 Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker          # required: this is what starts the stack at boot
newgrp docker                               # or log out and back in
docker compose version
```

---

## 4. The application

### 4.1 Clone

```bash
sudo mkdir -p /opt/wiser
sudo chown "$USER":"$USER" /opt/wiser
git clone https://github.com/EdvinBec/wiser.git /opt/wiser
cd /opt/wiser
git checkout muhamed/wise-api-usage
```

The systemd units assume `/opt/wiser`. If you put it elsewhere, edit `WorkingDirectory` and
`ExecStart` in `deploy/*.service`.

### 4.2 Fill in the secrets

```bash
cp .env.production.example .env
openssl rand -base64 32     # -> POSTGRES_PASSWORD
openssl rand -base64 48     # -> Jwt__Secret
nano .env
```

Every line marked `# FILL IN` needs a value:

| Variable | Value |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -base64 32` |
| `Frontend__Url` | `https://your-domain` — scheme, no trailing slash |
| `Jwt__Secret` | `openssl rand -base64 48`, **not** the development one |
| `Google__ClientId` | from §5 |
| `Google__ClientSecret` | from §5 |

Check `FRONTEND_PORT` is actually free before the first start:

```bash
ss -ltnp | grep -E ':(8080|5013)\b' || echo "both free"
```

`.env` is gitignored and stays on the laptop. Nothing here is ever committed.

> **POSTGRES_PASSWORD only applies the first time.** It creates the database. Changing it later
> does nothing to an existing volume — you have to `ALTER USER` inside the container. Get it
> right now and you never think about it again.

### 4.3 First start

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose ps
curl -s http://127.0.0.1:8080/api/wise/published
```

That last command should print something like `{"publishedAt":"2026-10-05T15:31"}`. If it does,
the whole chain works: nginx → backend → Wise.

Database migrations run automatically at backend startup; there is no separate step.

### 4.4 Start at boot

```bash
sudo cp deploy/wiser.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wiser
systemctl status wiser
```

> **This laptop has full disk encryption, and that changes what "starts at boot" means.**
>
> The LUKS passphrase is asked for in the initramfs, before the OS exists. Until it is typed
> there is no network, no SSH and no Docker, so none of the units below help. The Mint login
> password is a different matter and does not block anything: systemd system services start
> with nobody logged in.
>
> What makes this liveable is the battery — it acts as a UPS, so a power cut does not reboot
> the machine and unplanned restarts are rare. Deliberate reboots still need someone at the
> keyboard, unless §4.5 is set up.

Test it properly — `sudo reboot`, then check the site comes back on its own. Expect to type the
disk passphrase first.

### 4.5 Unlocking the disk remotely

Optional, and worth it if you do not want to walk to the laptop after every reboot.
`dropbear-initramfs` puts a small SSH server in the initramfs so the passphrase can be typed
over the network:

```bash
sudo apt install -y dropbear-initramfs
# authorized_keys for the BOOT ssh server, separate from the one on the running system
sudo cp ~/.ssh/authorized_keys /etc/dropbear/initramfs/authorized_keys
sudo nano /etc/dropbear/initramfs/dropbear.conf     # DROPBEAR_OPTIONS="-p 2222 -s -j -k"
sudo update-initramfs -u
```

Then on reboot: `ssh -p 2222 root@laptop` and `cryptroot-unlock`.

Two things to know before relying on it. The initramfs has its own host key, so the first
connection warns about a changed key — that is expected, not an attack. And it needs networking
in the initramfs, which means DHCP has to work there; test the whole thing with someone near
the laptop before you need it in anger.

Also stop the system rebooting itself in the night, which would otherwise leave the site at a
passphrase prompt until morning:

```bash
sudo sed -i 's|^//\s*Unattended-Upgrade::Automatic-Reboot .*|Unattended-Upgrade::Automatic-Reboot "false";|'   /etc/apt/apt.conf.d/50unattended-upgrades
grep -n 'Automatic-Reboot' /etc/apt/apt.conf.d/50unattended-upgrades
```

---

## 5. Google sign-in

Google Cloud console → **APIs & Services → Credentials → OAuth 2.0 Client ID**, type
**Web application**. Register exactly:

- Authorised JavaScript origin: `https://your-domain`
- Authorised redirect URI: `https://your-domain/signin-google`

That path is not a typo and is not `/auth/google/callback`. `/signin-google` is where the OAuth
middleware itself listens; the controller route is a later hop. nginx forwards it explicitly —
without that line the callback would land on the SPA and login would die silently at the last
step.

Put the client ID and secret in `.env`, then `deploy/update.sh --force`.

A `redirect_uri_mismatch` from Google means the registered URI and `Frontend__Url` disagree.

---

## 6. Tunnel

Point it at **one** thing:

```
http://127.0.0.1:8080
```

No separate rule for `/api` — nginx inside the frontend container already routes it. One
ingress, one origin.

The tunnel must forward `X-Forwarded-Proto: https`. Cloudflare does this by default. Without
it the OAuth redirect comes back as `http://` and Google rejects it.

---

## 7. Updates without downtime in the daytime

Images are built while the old containers keep serving; only the swap interrupts anything, and
that is a few seconds. The timer runs it at **04:30**.

```bash
sudo cp deploy/wiser-update.service deploy/wiser-update.timer /etc/systemd/system/
sudo cp deploy/wiser-backup.service deploy/wiser-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wiser-update.timer wiser-backup.timer
systemctl list-timers 'wiser-*'
```

To move the window, edit `OnCalendar` in `deploy/wiser-update.timer` and
`systemctl daemon-reload`. `Persistent=true` means a run missed because the laptop was off
happens once it is back, rather than being skipped.

`deploy/update.sh` checks health after the swap and **rolls back to the previous commit** if
the site does not answer within a minute. A failed update leaves you on the old version, not on
a dead site.

Manually, any time:

```bash
cd /opt/wiser
deploy/update.sh              # does nothing if there is no new commit
deploy/update.sh --force      # rebuild and restart anyway
```

---

## 8. Backups

`deploy/backup.sh` dumps the database to `deploy/backups/` at **03:30**, an hour before the
update, so the newest dump always predates the newest deploy. Fourteen days are kept.

Restore:

```bash
gunzip -c deploy/backups/wiser-YYYYmmdd-HHMMSS.sql.gz \
  | docker compose exec -T database psql -U wiser -d wiser
```

The dumps live on the same laptop, which is not a backup if the disk dies. Copying
`deploy/backups/` somewhere else on a schedule is worth doing — we have not set that up.

---

## 9. Day to day

```bash
cd /opt/wiser

docker compose ps                                   # what is running
docker compose logs -f backend --tail 100           # follow the backend
docker compose logs -f frontend --tail 100          # nginx access and errors
systemctl list-timers 'wiser-*'                     # when updates and backups next run
journalctl -u wiser-update.service -n 50            # what the last update did

docker compose --profile tools up -d pgadmin        # needs PGADMIN_PASSWORD in .env
# then from Windows:  ssh -L 5050:127.0.0.1:5050 user@laptop   and open localhost:5050
```

---

## 10. State as of handover

**Done and verified on the Windows machine:**

- Timetable is read from Wise over HTTP; the Playwright/Excel scraper is deleted, along with
  the database tables it filled
- Production stack built and exercised end to end: SPA routing, API through nginx on one
  origin, auth endpoints, PWA service worker and manifest
- Secrets out of the repo; the root `.env` is the single source for both compose and local runs
- Production hardening: developer exception page and Swagger are development-only, CORS is
  narrowed to `Frontend__Url`, backend and database bind to loopback, pgadmin has no default
  password

**Not done, needs the laptop:**

- Everything in §3 to §8 — nothing in this list has run on real hardware yet
- Remote disk unlock (§4.5). Until it exists, every reboot needs someone at the keyboard to
  type the LUKS passphrase; the battery is what keeps that rare.
- Google OAuth against the real domain. The redirect path and the `/api` prefix in the callback
  were both wrong for this routing and were fixed here, but the fix has never completed a real
  round trip with Google. Expect this to be the fiddliest part.
- Off-machine copy of the backups

**Known, deliberately left:**

- An old database password sits in the git history of this public repo. It is out of the files
  and was never the production one, but treat it as burned and never reuse it.
- Three eslint errors in `frontend/src/lib/i18n.tsx`, pre-existing, unrelated to any of this.
- Six build warnings, all auto-generated class names in old migrations. Renaming them would
  rewrite migration history for no gain.
