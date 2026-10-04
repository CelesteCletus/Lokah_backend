# Lokah Builders — Backend API Server

RESTful API backend for **Lokah Builders & Developers Pvt Ltd**, built with Node.js, Express, and MySQL.

---

## Tech Stack
- **Runtime**: Node.js 18+ / 20+
- **Framework**: Express.js
- **Database**: MySQL 8.0+ / MariaDB 10.5+ (SSL supported)
- **Authentication**: JWT (Access Tokens + HttpOnly Refresh Tokens) & bcryptjs
- **File Storage**: Local uploads (`/public/uploads/`) with Cloudinary fallback support

---

## Production Deployment

### 1. Install Production Dependencies
```bash
npm install --production
```

### 2. Configure Environment Variables
Create or edit `.env` in this directory (use `.env.example` as a template):

```env
PORT=5000
NODE_ENV=production

# Database Configuration (MySQL)
DB_HOST=your-mysql-host.com
DB_PORT=3306
DB_NAME=lokah_builders
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=true

# Security Secrets (Must be unique random strings in production)
JWT_SECRET=your_long_random_jwt_secret_string
JWT_REFRESH_SECRET=your_long_random_jwt_refresh_secret_string
COOKIE_SECRET=your_long_random_cookie_secret_string

# Frontend Integration & CORS
FRONTEND_URL=https://lokahbuilders.com
CORS_ORIGIN=https://lokahbuilders.com

# Initial Admin Credentials
ADMIN_EMAIL=admin@lokahbuilders.com
ADMIN_NAME=Administrator
ADMIN_PASSWORD=admin123
```

### 3. Start the Server

* **Direct Node start:**
  ```bash
  npm start
  ```

* **Using PM2 Process Manager (Recommended for production VPS):**
  ```bash
  pm2 start index.js --name "lokah-api"
  pm2 save
  pm2 startup
  ```

* **Using Docker:**
  ```bash
  docker build -t lokah-backend .
  docker run -p 5000:5000 --env-file .env lokah-backend
  ```

---

## Health Check
Once deployed, verify the server is running by opening:
```
GET /health
```
Returns: `{"status":"ok","uptime":123.45}`
