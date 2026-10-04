// MySQL DATETIME/TIMESTAMP columns require 'YYYY-MM-DD HH:MM:SS' — unlike
// PostgreSQL, mysql2 does not coerce a JS ISO string (with 'T'/'Z'/millis)
// on the way in. Use this instead of `new Date().toISOString()` anywhere a
// timestamp is written directly into a query.
export const mysqlNow = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

export const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
};

export const sanitizeInput = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const parseCleanArray = (val) => {
  if (!val) return [];
  let items = [];
  if (Array.isArray(val)) {
    items = val;
  } else if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parseCleanArray(parsed);
    } catch {
      items = val.split(',').map(s => s.trim());
    }
  }

  const result = [];
  for (const item of items) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          const inner = JSON.parse(trimmed);
          result.push(...parseCleanArray(inner));
          continue;
        } catch {}
      }
      const cleaned = trimmed.replace(/^["'\\]+|["'\\]+$/g, '').trim();
      if (cleaned) result.push(cleaned);
    } else if (Array.isArray(item)) {
      result.push(...parseCleanArray(item));
    }
  }
  return [...new Set(result)];
};
