import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjsDistPath = require.resolve('pdfjs-dist/package.json');
export const standardFontDataUrl = path.join(path.dirname(pdfjsDistPath), 'standard_fonts/');
