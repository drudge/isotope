#!/bin/sh
set -e

# Add http:// prefix if no protocol specified
if [ -n "$TECHNITIUM_API_URL" ]; then
    case "$TECHNITIUM_API_URL" in
        http://*|https://*)
            # Already has protocol
            ;;
        *)
            # Add http:// prefix
            TECHNITIUM_API_URL="http://${TECHNITIUM_API_URL}"
            ;;
    esac
fi

export TECHNITIUM_API_URL

# Substitute only TECHNITIUM_API_URL in nginx config
envsubst '${TECHNITIUM_API_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
