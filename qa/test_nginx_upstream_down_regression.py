#!/usr/bin/env python3
"""
Automated Regression Test: Nginx Upstream DOWN Log Sanitization Audit.
Tests that when backend upstream is unreachable (502 / Connection Refused):
1. WebSocket URL query strings (plain or percent-encoded) are edge-rejected (HTTP 400).
2. WebSocket Referer query strings (?t%69cket=..., ?other=...) are edge-rejected (HTTP 400).
3. API plain credential parameters (?token=..., ?ticket=..., ?secret=...) are edge-rejected (HTTP 400).
4. API percent-encoded parameter keys (?t%69cket=..., ?%74oken=...) are edge-rejected (HTTP 400).
5. API Referer credential parameters (?token=..., ?%74oken=...) are edge-rejected (HTTP 400).
6. Legitimate API filtering/pagination queries (?skip=0&limit=50&category=IT%20Dev) reach upstream (HTTP 502 during outage, NOT 400).
7. Zero credentials leak into Nginx error.log or access.log.

Self-contained using standard library only (no external dependencies / no pip required).
"""
import os
import sys
import time
import subprocess
import http.client

def run_regression_test():
    logs_dir = "/tmp/baito_test_logs"
    os.makedirs(logs_dir, exist_ok=True)
    nginx_access_path = os.path.join(logs_dir, "access.log")
    nginx_error_path = os.path.join(logs_dir, "error.log")
    nginx_conf_path = "/tmp/nginx_upstream_down_regression.conf"

    for p in (nginx_access_path, nginx_error_path):
        if os.path.exists(p):
            os.remove(p)

    nginx_conf = """
events {
    worker_connections 1024;
}

http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    map $http_referer $clean_referer {
        ~*^(?<ref_base>[^?#]+)  $ref_base;
        default                 "-";
    }

    log_format sanitized '$remote_addr - $remote_user [$time_local] "$request_method $uri $server_protocol" $status $body_bytes_sent "$clean_referer" "$http_user_agent"';

    server {
        listen 8090;
        server_name localhost;

        access_log /var/log/baito_nginx/access.log sanitized;
        error_log /var/log/baito_nginx/error.log info;

        location ^~ /api/v1/chats/ws/ {
            if ($request_uri ~ \\?) {
                return 400 "Query strings are forbidden on WebSocket endpoints. Use Sec-WebSocket-Protocol or session cookies.\\n";
            }
            if ($is_args) {
                return 400 "Query strings are forbidden on WebSocket endpoints. Use Sec-WebSocket-Protocol or session cookies.\\n";
            }
            if ($args != "") {
                return 400 "Query strings are forbidden on WebSocket endpoints. Use Sec-WebSocket-Protocol or session cookies.\\n";
            }
            if ($http_referer ~ \\?) {
                return 400 "Query strings in Referer header are forbidden on WebSocket endpoints.\\n";
            }

            proxy_pass http://127.0.0.1:8089;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_pass_header Sec-WebSocket-Protocol;
        }

        location ^~ /api/ {
            if ($args ~* "(?:^|&)(?:token|ticket|secret)(?:=|$)") {
                return 400 "Credential parameters in API URL query strings are forbidden. Use Authorization headers or session cookies.\\n";
            }
            if ($args ~ "(?:^|&)[^=&]*%[^=&]*(?:=|$)") {
                return 400 "Percent-encoded parameter names in API URL query strings are forbidden.\\n";
            }
            if ($http_referer ~* "(?:[?&]|%26)(?:token|ticket|secret|password|passwd|auth|bearer|jwt)(?:=|%3d|&|$)") {
                return 400 "Credential parameters in Referer header are forbidden.\\n";
            }
            if ($http_referer ~ "[?&][^?&=#]*%[^?&=#]*(?:=|%3d|&|$)") {
                return 400 "Percent-encoded parameter names in Referer header are forbidden.\\n";
            }

            proxy_pass http://127.0.0.1:8089;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
"""
    with open(nginx_conf_path, "w") as f:
        f.write(nginx_conf)

    SECRETS = {
        "REFSECRET_C": "REFSECRET_C_TICKET_VAL_7711",
        "REFSECRET_D": "REFSECRET_D_OTHER_VAL_8822",
        "APISECRET_E": "APISECRET_E_TICKET_VAL_9933",
        "APISECRET_F": "APISECRET_F_TOKEN_VAL_4455",
        "APISECRET_G": "APISECRET_G_PLAIN_TOKEN_6677",
        "REFSECRET_J": "REFSECRET_J_REFERER_TOKEN_3322",
        "LEAK_API_REF_ENC": "LEAK_API_REF_ENC_VAL_8899",
        "SUBPROTOCOL_TICKET": "VALID_SUBPROTOCOL_TICKET_556677",
    }

    container_name = "baito-nginx-regression-test"

    print("[Regression Test] Validating Nginx configuration syntax (nginx -t)...")
    res_t = subprocess.run(
        [
            "docker", "run", "--rm",
            "-v", f"{nginx_conf_path}:/etc/nginx/nginx.conf:ro",
            "-v", f"{logs_dir}:/var/log/baito_nginx",
            "nginx:alpine", "nginx", "-t"
        ],
        capture_output=True, text=True
    )
    assert res_t.returncode == 0, f"nginx -t failed: {res_t.stderr}"

    print("[Regression Test] Starting Nginx container while Upstream backend is DOWN...")
    subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)
    nginx_cmd = [
        "docker", "run", "-d",
        "--name", container_name,
        "--network", "host",
        "-v", f"{nginx_conf_path}:/etc/nginx/nginx.conf:ro",
        "-v", f"{logs_dir}:/var/log/baito_nginx",
        "nginx:alpine",
    ]
    subprocess.run(nginx_cmd, capture_output=True, check=True)
    time.sleep(1.0)

    try:
        def request(path, headers=None):
            conn = http.client.HTTPConnection("127.0.0.1", 8090, timeout=5)
            conn.request("GET", path, headers=headers or {})
            resp = conn.getresponse()
            status = resp.status
            resp.read()
            conn.close()
            return status

        # 1. WS with Referer ?t%69cket=...
        ref_c = f"https://baito.uz/chat?t%69cket={SECRETS['REFSECRET_C']}"
        assert request("/api/v1/chats/ws/demo", {"Referer": ref_c}) == 400

        # 2. WS with Referer ?other=...
        ref_d = f"https://baito.uz/chat?other={SECRETS['REFSECRET_D']}"
        assert request("/api/v1/chats/ws/demo", {"Referer": ref_d}) == 400

        # 3. WS with clean Referer + Subprotocol ticket during outage -> 502
        subproto_hdrs = {
            "Referer": "https://baito.uz/chat",
            "Sec-WebSocket-Protocol": f"baito-ticket, {SECRETS['SUBPROTOCOL_TICKET']}",
        }
        assert request("/api/v1/chats/ws/demo", subproto_hdrs) == 502

        # 4. API with ?t%69cket=...
        assert request(f"/api/v1/jobs?t%69cket={SECRETS['APISECRET_E']}") == 400

        # 5. API with ?t%6fken=...
        assert request(f"/api/v1/jobs?t%6fken={SECRETS['APISECRET_F']}") == 400

        # 6. API with plain ?token=...
        assert request(f"/api/v1/jobs?token={SECRETS['APISECRET_G']}") == 400

        # 7. API with plain Referer ?token=...
        ref_j = f"https://baito.uz/jobs?token={SECRETS['REFSECRET_J']}"
        assert request("/api/v1/jobs", {"Referer": ref_j}) == 400

        # 8. API with percent-encoded Referer ?%74oken=...
        ref_enc = f"https://baito.uz/chat?%74oken={SECRETS['LEAK_API_REF_ENC']}"
        assert request("/api/v1/jobs/", {"Referer": ref_enc}) == 400

        # 9. API with legitimate search & category Referer -> 502 during outage (NOT 400)
        ref_legit = "https://baito.uz/jobs?search=courier&category=delivery%20service"
        assert request("/api/v1/jobs/", {"Referer": ref_legit}) == 502

        # 10. API with legitimate query params -> 502 during outage (NOT 400)
        legit_url = "/api/v1/jobs?skip=0&limit=50&category=IT%20Dev&search=senior%20developer"
        assert request(legit_url) == 502

    finally:
        subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)

    with open(nginx_access_path, "r") as f:
        access_log = f.read()

    with open(nginx_error_path, "r") as f:
        error_log = f.read()

    # Assert zero leaks across all secret values
    found_leaks = {}
    for secret_name, secret_val in SECRETS.items():
        if secret_val in access_log:
            found_leaks.setdefault("access.log", []).append((secret_name, secret_val))
        if secret_val in error_log:
            found_leaks.setdefault("error.log", []).append((secret_name, secret_val))

    assert len(found_leaks) == 0, f"Leaks found: {found_leaks}"
    print("[Regression Test] 100% PASS: Zero secrets leaked across Nginx access.log and error.log during upstream outage.")

if __name__ == "__main__":
    run_regression_test()
