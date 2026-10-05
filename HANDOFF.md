# Context primer

Paste this whole file at the start of a new conversation when you need help with this project
somewhere that does not have the original session — a phone, a different machine, a colleague's
screen. It is deliberately short; `DEPLOYMENT.md` in this repository has the detail.

---

I run **UrnikWiser**, a timetable site for UM FERI students, live at **https://urnik.online**.
Repo: `github.com/EdvinBec/wiser`, branch `muhamed/wise-api-usage`.

**What it does.** A student picks subjects from any programme and year, and for each one picks
their group where the exercises split into several. The result is their own timetable.

**Where the data comes from.** The backend reads the published Wise Timetable web layer over
plain HTTP (`wise-tt.com/web/feri/`) and parses its iCalendar feed. There is no scraping with a
browser and no official API account. The browser cannot call Wise directly — no CORS — so
everything goes through our backend, which caches per subject rather than per student.

**Stack.** .NET 9 backend, React + Vite frontend (PWA), PostgreSQL. Three Docker containers.
The database holds only user accounts and each user's subject selections; timetable data is
re-read from Wise on demand.

**Request path.** Cloudflare Tunnel → frontend container (nginx on 127.0.0.1:8080). nginx
serves the static SPA and proxies `/api`, `/auth`, `/user` and `/signin-google` to the backend
on the same origin, so there is no CORS and no port open on the router.

---

## The server

A **Linux Mint 21.3 laptop at home**, user `cevapar123`, checkout at `/opt/wiser`.
I reach it with `ssh wiser` from my Windows machine (key auth, LAN only).

Four things about this machine cause most problems:

1. **`/home` is eCryptfs-encrypted** on top of LUKS full-disk encryption, and is only mounted
   when somebody logs in with a password. Anything that writes to `$HOME` from a systemd timer
   fails. This already broke the app (now in `/opt`), the SSH key (now in
   `/etc/ssh/authorized_keys/`), cloudflared (now `/etc/cloudflared/`) and the Docker CLI (now
   `DOCKER_CONFIG` beside the checkout). Expect it again.
2. **The battery is dead** and reports no capacity, so it is not a UPS. A power cut is a real
   reboot, and the boot stops at the LUKS passphrase prompt.
3. **Remote unlock exists but only on the LAN.** `dropbear-initramfs` listens on port 2222, and
   only over Ethernet — the initramfs has no WiFi stack, so the cable has to stay plugged in.
   From outside the house I cannot unlock it.
4. **The account is `cevapar123`, not `wiser`.** `deploy/install-units.sh` fills that into the
   systemd units.

## Scheduled

- `03:30` database dump to `deploy/backups/`, 14 days kept
- `04:32` `deploy/update.sh` — pulls, builds while the old containers keep serving, swaps in
  about two seconds, health-checks, and rolls back to the last deployed commit if the site does
  not answer

## Everyday commands

```bash
ssh wiser
cd /opt/wiser

docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend --tail 100

deploy/update.sh --force      # deploy now
deploy/backup.sh              # back up now
systemctl list-timers 'wiser-*'
journalctl -u cloudflared -n 50
```

## Known gaps

- Backups sit on the same disk they protect; nothing copies them off the machine.
- No remote unlock from outside the house; a replacement battery or a UPS would remove the
  problem rather than work around it.
- An old database password is in this repo's git history. It is out of the files and was never
  the production one, but it should be treated as burned.
- Secrets live only in `/opt/wiser/.env` on the server. `.env.production.example` is the
  template; nothing secret is ever committed.

---

Read `DEPLOYMENT.md` in the repository for the full runbook: architecture, first-time setup,
what each variable does, and how to restore a backup.
