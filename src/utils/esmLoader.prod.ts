/**
 * Production ESM Loader (for Webpack environment)
 * 
 * Uses static imports so Webpack can identify and bundle 
 * the ESM dependencies into the final extension.js
 */
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';

export async function loadUnified() {
    return { unified, uniorgParse };
}
