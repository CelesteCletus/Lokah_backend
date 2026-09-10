import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const backupDatabase = () => {
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || '3306';
  const DB_NAME = process.env.DB_NAME || 'lokah_builders';

  const rootDir = path.resolve();
  const backupsDir = path.join(rootDir, 'backups');

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupsDir, `backup-${DB_NAME}-${timestamp}.sql`);

  console.log(`🔄 Starting database backup for "${DB_NAME}"...`);

  const cmd = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${DB_PASSWORD ? `-p${DB_PASSWORD}` : ''} ${DB_NAME} > "${backupFile}"`;

  exec(cmd, { shell: '/bin/bash' }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Database backup failed:');
      console.error(error.message);
      return;
    }
    if (stderr && !stderr.toLowerCase().includes('warning')) {
      console.log(`⚠️ Backup output info: ${stderr}`);
    }
    console.log(`✅ Backup completed successfully: ${backupFile}`);
  });
};

backupDatabase();
