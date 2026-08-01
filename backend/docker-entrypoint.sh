#!/bin/sh
set -eu

storage_root="${PORTAL_PACKAGE_STORAGE_ROOT:-/var/lib/astratabi/packages}"

mkdir -p "$storage_root"
chown astratabi:astratabi "$storage_root"

exec su-exec astratabi java -XX:MaxRAMPercentage=75.0 -jar /app/application.jar
