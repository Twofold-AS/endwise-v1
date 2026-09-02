;; Mal — host/db fylles fra env i entrypoint.sh. Ingen hemmeligheter her.
;; Passord ligger bare i userlist.txt (skrevet ved start, aldri i git).

[databases]
* = host=__PG_HOST__ port=__PG_PORT__ dbname=__PG_DATABASE__

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = __AUTH_FILE__
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
server_tls_sslmode = require
ignore_startup_parameters = extra_float_digits
max_prepared_statements = 0
server_reset_query =
pidfile = __PIDFILE__
unix_socket_dir = __CONF_DIR__
