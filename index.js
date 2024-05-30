import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

const PORT = 7000;

let PDF_NAME = '';

/**
 * @type {Buffer | undefined}
 */
let PDF_FILE_BUFFER = undefined;

/**
 * @param {{oldName: string, newName: string}[]} fields
 */
async function renameFields(fields) {
  const pdfDoc = await PDFDocument.load(PDF_FILE_BUFFER, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  for (const field of pdfDoc.getForm().getFields()) {
    const fieldName = field.getName();

    const newFieldName = fields.find((f) => f.oldName === fieldName);

    if (!newFieldName?.newName) {
      continue;
    }

    field.acroField.setPartialName(newFieldName.newName);
    field.acroField.dict.set(
      PDFName.of('TU'),
      PDFHexString.fromText(newFieldName.newName)
    );
  }

  PDF_FILE_BUFFER = Buffer.from(await pdfDoc.save());

  return { message: 'success' };
}

// Helper to get __dirname with ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const upload = multer();

app.use(express.static('public'));
app.use(express.json());

/**
 * ________________________________________________________________________________
 * Routes
 * ________________________________________________________________________________
 */

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/view', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/view.html'));
});

app.get('/name', (_, res) => {
  if (!PDF_NAME || !PDF_FILE_BUFFER) {
    return res.status(400).send({
      message: 'Please upload a PDF first to see and rename its field',
    });
  }
  res.status(200).send(PDF_NAME);
});

app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    // Check if PDF can be processed
    await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });

    PDF_FILE_BUFFER = req.file.buffer;
    PDF_NAME = req.file.originalname;

    res.status(201).send({ message: 'success' });
  } catch (e) {
    res
      .status(400)
      .send({ message: e?.message || 'this file cannot be processed' });
  }
});

app.get('/file', (_, res) => {
  if (PDF_FILE_BUFFER) {
    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).send(PDF_FILE_BUFFER);
  } else {
    res.status(400).send({
      message: 'Please upload a PDF first to see and rename its field',
    });
  }
});

app.patch('/update', async (req, res) => {
  if (!req.body || !Array.isArray(req.body)) {
    res.status(500).send({
      message:
        'Proper updated field data not provided. This is an internal server error',
    });
  } else {
    try {
      await renameFields(req.body);

      res.status(200).send({ message: ' success' });
    } catch (e) {
      console.log(e);
      res.status(500).send({
        message:
          e?.message ||
          'Some error happened during updating the PDF. This is an internal server error',
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
