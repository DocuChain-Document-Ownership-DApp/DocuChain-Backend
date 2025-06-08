import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getEmailTemplate = () => {
    const templatePath = path.join(__dirname, '../trmplates/email.html');
    return fs.readFileSync(templatePath, 'utf8');
}; 