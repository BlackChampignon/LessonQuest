#!/bin/sh
set -eu
# Bind mounts replace image permissions. Prepare durable storage, then drop privileges.
mkdir -p "${DATA_DIR:-/app/data}"
chown -R lessonquest:lessonquest "${DATA_DIR:-/app/data}"
exec gosu lessonquest "$@"
