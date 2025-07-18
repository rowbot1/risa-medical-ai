# Deployment Guide for Risa Medical

## Prerequisites

- Server with Ubuntu 20.04+ or similar
- Docker and Docker Compose installed
- Domain name pointed to server IP
- SSL certificates (or use Let's Encrypt)

## Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/risamedical/website.git
   cd website
   ```

2. **Create production .env file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set all production values:
   - Database credentials
   - JWT secret (generate with `openssl rand -hex 32`)
   - SMTP settings for email
   - Stripe API keys
   - Cal.com username

3. **Create SSL certificates**
   ```bash
   mkdir ssl
   # Option 1: Use Let's Encrypt
   sudo certbot certonly --standalone -d risamedical.co.uk -d www.risamedical.co.uk
   
   # Option 2: Copy existing certificates
   cp /path/to/cert.pem ./ssl/cert.pem
   cp /path/to/key.pem ./ssl/key.pem
   ```

## Deployment Methods

### Method 1: Docker Compose (Recommended)

1. **Build and start services**
   ```bash
   docker-compose up -d --build
   ```

2. **Check logs**
   ```bash
   docker-compose logs -f
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec app node server/migrations/run-migrations.js
   ```

### Method 2: PM2 (Alternative)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Install dependencies**
   ```bash
   npm install --production
   cd server && npm install --production
   ```

3. **Start application**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Method 3: Systemd Service

1. **Create service file**
   ```bash
   sudo nano /etc/systemd/system/risa-medical.service
   ```

   ```ini
   [Unit]
   Description=Risa Medical Server
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/risamedical
   ExecStart=/usr/bin/node server/server.js
   Restart=on-failure
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

2. **Enable and start service**
   ```bash
   sudo systemctl enable risa-medical
   sudo systemctl start risa-medical
   ```

## Post-Deployment

1. **Set up backups**
   ```bash
   # Add to crontab
   0 2 * * * sqlite3 /var/www/risamedical/data/risa.db ".backup '/backups/risa-$(date +\%Y\%m\%d).db'"
   ```

2. **Configure monitoring**
   - Set up uptime monitoring (e.g., UptimeRobot)
   - Configure log rotation
   - Set up alerts for errors

3. **Security checklist**
   - [ ] Change default admin password
   - [ ] Verify firewall rules (only 80, 443, SSH)
   - [ ] Enable fail2ban
   - [ ] Review and update security headers
   - [ ] Test SSL configuration
   - [ ] Verify all environment variables are set

## Maintenance

### Update application
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Backup database
```bash
docker-compose exec app sqlite3 data/risa.db ".backup '/backups/risa-backup.db'"
```

### View logs
```bash
# Docker logs
docker-compose logs -f app

# PM2 logs
pm2 logs

# System logs
journalctl -u risa-medical -f
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo lsof -i :5000
   sudo kill -9 <PID>
   ```

2. **Permission errors**
   ```bash
   sudo chown -R www-data:www-data /var/www/risamedical
   ```

3. **Database locked**
   ```bash
   # Restart the application
   docker-compose restart app
   ```

### Health Check

```bash
curl http://localhost:5000/api/health
```

## Security Notes

1. Always use HTTPS in production
2. Keep dependencies updated
3. Regularly backup database
4. Monitor logs for suspicious activity
5. Use strong passwords for all accounts
6. Enable 2FA where possible
7. Regular security audits