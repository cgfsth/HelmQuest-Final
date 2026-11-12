import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MaterialsError, PDF_LIMIT, validatePdf } from './learningMaterials.js';

const execute = promisify(execFile);
// Presentations are converted locally. No public URL or third-party viewer is used.
export function createPresentationPreview({ executable = process.env.LIBREOFFICE_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\LibreOffice\\program\\soffice.com' : 'libreoffice'), run = execute } = {}) {
  return async file => {
    const extension = extname(file?.originalname || '').toLowerCase();
    if (extension === '.pdf') { validatePdf(file); return file; }
    if (!['.ppt', '.pptx'].includes(extension) || !Buffer.isBuffer(file?.buffer) || !file.buffer.length || file.buffer.length > PDF_LIMIT) throw new MaterialsError(400, 'Choose a PDF, PPT or PPTX file of 15 MB or smaller.');
    const signature = extension === '.pptx' ? Buffer.from([0x50, 0x4b, 0x03, 0x04]) : Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    if (!file.buffer.subarray(0, signature.length).equals(signature)) throw new MaterialsError(400, 'This file is not a valid PowerPoint presentation.');
    const directory = await mkdtemp(join(tmpdir(), 'helmquest-presentation-'));
    try {
      const profile = join(directory, 'profile');
      await mkdir(join(profile, 'user'), { recursive: true });
      await writeFile(join(profile, 'user', 'registrymodifications.xcu'), `<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Common/Load"><prop oor:name="UpdateDocMode" oor:op="fuse"><value>0</value></prop></item></oor:items>`);
      const input = join(directory, `presentation${extension}`);
      await writeFile(input, file.buffer);
      try {
        await run(executable, [`-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--nologo', '--nodefault', '--norestore', '--convert-to', 'pdf:impress_pdf_Export', '--outdir', directory, input], { timeout: 90000, maxBuffer: 65536, windowsHide: true });
      } catch (error) {
        if (error.code === 'ENOENT') throw new MaterialsError(503, 'Presentation preview is not configured. The administrator must install LibreOffice on the backend and set LIBREOFFICE_PATH. You can upload an exported PDF meanwhile.');
        throw new MaterialsError(422, 'This presentation could not be converted. Export it as a PDF and try again.');
      }
      let buffer;
      try { buffer = await readFile(join(directory, 'presentation.pdf')); }
      catch { throw new MaterialsError(422, 'This presentation could not be converted. Check that it opens in PowerPoint, or upload an exported PDF.'); }
      const converted = { originalname: file.originalname.replace(/\.pptx?$/i, '.pdf'), mimetype: 'application/pdf', buffer };
      validatePdf(converted);
      return converted;
    } finally { await rm(directory, { recursive: true, force: true }); }
  };
}
