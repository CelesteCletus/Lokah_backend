import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Checks whether Cloudinary environment variables are configured.
 */
export const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Uploads a local file to Cloudinary using their signed REST API.
 * Uses native Node.js crypto and fetch (zero external dependencies).
 * 
 * @param {string} filePath - Absolute path to local file on disk
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<string|null>} Cloudinary HTTPS URL or null if failed
 */
export const uploadToCloudinary = async (filePath, folder = 'lokah_builders') => {
  if (!isCloudinaryConfigured()) return null;

  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET.trim();

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer]);

    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('❌ Cloudinary upload rejected:', errText);
      return null;
    }

    const data = await res.json();
    return data.secure_url || data.url || null;
  } catch (err) {
    console.error('❌ Cloudinary upload error:', err.message);
    return null;
  }
};
