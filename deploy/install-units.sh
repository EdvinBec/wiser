#!/usr/bin/env bash
#
# Installs the systemd units, filling in this machine's checkout path and user.
#
# The unit files in the repository carry placeholders rather than real values, because the
# account running the stack and the directory it lives in differ per machine. Copying them
# straight into /etc/systemd/system leaves User=wiser, an account that usually does not exist,
# and the unit then fails at boot with a message that does not say why.
#
# Usage:  sudo -v && deploy/install-units.sh
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
RUN_USER="${SUDO_USER:-$USER}"

if ! id -nG "$RUN_USER" | tr ' ' '\n' | grep -qx docker; then
  echo "warning: $RUN_USER is not in the docker group; the units will not be able to talk to Docker" >&2
fi

UNITS=(wiser.service wiser-update.service wiser-update.timer wiser-backup.service wiser-backup.timer)

for unit in "${UNITS[@]}"; do
  src="deploy/$unit"
  [[ -f "$src" ]] || { echo "missing $src" >&2; exit 1; }

  sed -e "s|^WorkingDirectory=.*|WorkingDirectory=$ROOT|" \
      -e "s|^User=.*|User=$RUN_USER|" \
      -e "s|^ExecStart=/opt/wiser/|ExecStart=$ROOT/|" \
      "$src" | sudo tee "/etc/systemd/system/$unit" >/dev/null

  echo "installed $unit  (user=$RUN_USER, dir=$ROOT)"
done

sudo systemctl daemon-reload
sudo systemctl enable wiser.service >/dev/null
sudo systemctl enable --now wiser-update.timer wiser-backup.timer >/dev/null

echo
echo "enabled:"
systemctl is-enabled wiser.service wiser-update.timer wiser-backup.timer | sed 's/^/  /'
echo
echo "next runs:"
systemctl list-timers 'wiser-*' --no-pager --no-legend | awk '{print "  " $1, $2, $3, $4, $NF}'
