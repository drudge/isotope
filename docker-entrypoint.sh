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

# Generate the cluster-node proxy allow-list (included by the server block).
# Enabled only when CLUSTER_NODE_ALLOWED_DOMAINS is set; otherwise it returns 403
# so it can never act as an open forward proxy.
CLUSTER_NODE_CONF=/etc/nginx/cluster-node.conf
if [ -n "$CLUSTER_NODE_ALLOWED_DOMAINS" ]; then
    # Turn "dns.example.com, foo.net" into an escaped regex alternation:
    # dns\.example\.com|foo\.net
    ALT=$(printf '%s' "$CLUSTER_NODE_ALLOWED_DOMAINS" \
        | tr ',' '\n' \
        | sed -e 's/[[:space:]]//g' -e 's/\./\\./g' \
        | grep -v '^$' \
        | paste -sd '|' -)
    RESOLVER="${CLUSTER_NODE_RESOLVER:-127.0.0.11}"
    cat > "$CLUSTER_NODE_CONF" <<EOF
location ~ ^/cluster-node/(?<up_scheme>https?)/(?<up_host>[^/]+?)(?<up_path>/.*)?\$ {
    # Reject any host that is not the allow-listed domain or a subdomain of it.
    if (\$up_host !~* "^([^.]+\\.)*(${ALT})(:[0-9]+)?\$") { return 403; }
    resolver ${RESOLVER} valid=30s;
    proxy_ssl_verify off;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
    proxy_set_header Host \$up_host;
    proxy_pass \$up_scheme://\$up_host\$up_path\$is_args\$args;
}
EOF
    echo "cluster-node proxy enabled for: $CLUSTER_NODE_ALLOWED_DOMAINS (resolver $RESOLVER)"
else
    cat > "$CLUSTER_NODE_CONF" <<'EOF'
location /cluster-node/ {
    default_type application/json;
    return 403 '{"status":"error","errorMessage":"Cluster-node proxy is disabled: set CLUSTER_NODE_ALLOWED_DOMAINS"}';
}
EOF
fi

# Start nginx
exec nginx -g 'daemon off;'
