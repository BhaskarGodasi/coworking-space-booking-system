# Docker & DevOps Architecture Document

## Versioning & Revision History
- **Version**: 1.1
- **Revision History**:
  - v1.0: Initial DevOps outline.
  - v1.1: Added `.env.example`, exact startup order, rollback strategies, and detailed troubleshooting.

---

## Docker Container Architecture

### Multi-stage Builds & Non-Root Containers
- **Backend**: 
  - *Stage 1*: Node base, `npm ci`, `npx prisma generate`, `npm run build`.
  - *Stage 2*: Minimal `node:alpine`. Copies `node_modules`, `dist/`, and `prisma/`. Runs as `USER node`.
- **Frontend**:
  - *Stage 1*: Node base, `npm ci`, `npm run build`.
  - *Stage 2*: `nginx:alpine`. Copies `dist/` to html directory. Runs as unprivileged nginx user.

### Volumes, Networks, & Secrets
- **Volumes**: `pg_data` mapped to `/var/lib/postgresql/data` (Ensures DB persistence).
- **Networks**: `internal_network` (DB <-> Backend) and `web_network` (Backend <-> Frontend).
- **Secrets**: Injected strictly via environment variables at runtime, never baked into images.

### Startup Order & Health Checks
1. **DB**: Boots up. Health check: `pg_isready -U postgres -d coworking`.
2. **Backend**: `depends_on` DB with `condition: service_healthy`.
   - *Pre-start execution*: `npx prisma migrate deploy` executes before Node starts.
   - *Health check*: `curl -f http://localhost:3000/health`.
3. **Frontend**: `depends_on` Backend with `condition: service_healthy`.
- **Restart Policies**: `unless-stopped` applied to all production services.
- **Resource Limits**: Configured in compose file to prevent memory leaks (e.g., `mem_limit: 512m` for backend).

---

## Production Deployment Architecture

### Nginx, HTTPS & Reverse Proxy
- **Nginx** handles static React asset delivery and acts as an API gateway routing `/api/` to the Node container.
- **HTTPS** terminated at Nginx via Certbot sidecar.
- Includes rate limiting (`limit_req_zone`) to protect Node.js from application-layer DDoS.

### Logging & Monitoring
- **Logging**: Containers log to `stdout`/`stderr` using Pino JSON format. Docker daemon configured with `json-file` driver, rotating logs at 10MB to prevent disk exhaustion.
- **Monitoring**: Backend exposes `/metrics` (Prometheus format). Health checks alert on service degradation.

### Data Protection: Backup & Restore
- **Backup**: Daily CronJob executes `pg_dump`, encrypts via GPG, and pushes to AWS S3.
- **Restore**: Admin runbook utilizing `pg_restore -c -d dbname < backup.dump` against the `db` container.

### Migration Failure Recovery & Rollback
- If `npx prisma migrate deploy` fails during deployment, the container crashes and Docker halts the rollout.
- **Rollback**: Revert the Git commit, rebuild the previous image tag, and redeploy. For schema rollbacks, manually execute down migrations before reverting the application code.

### Zero Downtime Deployment & Scaling
- **Scaling Strategy**: Backend is completely stateless. Increase `replicas: 3` in Swarm/K8s.
- **Zero Downtime**: Rolling updates orchestrated by Docker Swarm or Kubernetes, ensuring new containers pass health checks before traffic is routed to them, seamlessly draining old containers.

### CI/CD
- GitHub Actions triggers on `main`. Runs tests (spinning up ephemeral DB), builds images, and pushes to Docker Registry. Triggers SSH deployment script on target server.

---

## Troubleshooting Guide

### Production
- **502 Bad Gateway**: Check backend health. `docker logs backend`. Often indicates Node crashed or DB connection failed.
- **DB Connection Issues**: Verify `DATABASE_URL` matches internal Docker DNS (`postgres://user:pass@db:5432/db`).

### Local Development
- **HMR Not Working**: Ensure local volume mappings match container paths in `docker-compose.override.yml`.
- **Port Conflicts**: Ensure port 5432 or 3000 isn't bound by a local running service on the host.

---

## Environment Variables Specification (`.env.example`)

```ini
# Application
NODE_ENV=development
PORT=3000

# Database
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://postgres:password123@db:5432/coworking"

# Authentication
# Must be at least 32 characters, base64 or random string
JWT_SECRET="generate-a-secure-secret-key-here"
REFRESH_SECRET="generate-a-different-secure-key-here"
JWT_EXPIRES_IN="15m"
REFRESH_EXPIRES_IN="7d"

# Client URL (for CORS)
CLIENT_URL="http://localhost:5173"
```
