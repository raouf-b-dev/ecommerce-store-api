'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Load the first existing env file among `.env.${NODE_ENV}`, `.env.production`, `.env`.
 */
function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFiles = [`.env.${nodeEnv}`, '.env.production', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath });
      return fullPath;
    }
  }
  return null;
}

/**
 * Parse `--key=value` and `--flag` CLI arguments into a plain object.
 */
function parseArgs(argv = process.argv.slice(2)) {
  return argv.reduce((acc, arg) => {
    const [k, v] = arg.startsWith('--') ? arg.slice(2).split('=') : [arg, true];
    acc[k] = v === undefined ? true : v;
    return acc;
  }, {});
}

module.exports = { loadEnv, parseArgs };
