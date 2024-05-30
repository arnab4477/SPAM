const pdfjsLib = window.pdfjsLib;

document.addEventListener('DOMContentLoaded', renderPDF);

document.getElementById('download').addEventListener('click', download);

async function download() {
  const [name, response] = await Promise.all([
    fetch('/name', {
      method: 'GET',
    }),
    await fetch('/file', {
      method: 'GET',
    }),
  ]);

  if (!response.ok || !name.ok) {
    alert(await processErrorMessage(response));
    window.location.href = '/';
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = await name.text(); // Specify the filename

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @type {{name: string}[]}
 */
let fields = [];

function createTextInputFields(fields) {
  const fieldsList = document.getElementById('fields');
  fieldsList.innerHTML = '';

  fields.forEach((field) => {
    const listItem = document.createElement('li');

    const input = document.createElement('input');

    input.type = 'text';
    input.value = field.name;

    listItem.appendChild(input);
    fieldsList.appendChild(listItem);
  });

  const saveButton = document.getElementById('save-fields');
  saveButton.addEventListener('click', handleSave);
}

function handleSave() {
  const inputValues = Array.from(document.querySelectorAll('#fields input'));

  const body = [];

  for (let i = 0; i < inputValues.length; i++) {
    body.push({
      oldName: fields[i].name,
      newName: inputValues[i].value,
    });
  }

  fetch('/update', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
    .then(async (response) => {
      if (response.ok) {
        console.log('Values updated successfully');
        renderPDF();
      } else {
        alert(await this.processErrorMessage(response));
      }
    })
    .catch((error) => {
      console.log(error);
      alert(error?.message || 'Some error happened');
    });
}

async function renderPDF() {
  fields = [];
  const heading = document.getElementById('heading');

  const [name, response] = await Promise.all([
    fetch('/name', {
      method: 'GET',
    }),
    await fetch('/file', {
      method: 'GET',
    }),
  ]);

  if (!response.ok || !name.ok) {
    alert(await processErrorMessage(response));
    window.location.href = '/';
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  heading.textContent = await name.text();

  const pdfContainer = document.getElementById('pdfContainer');
  pdfContainer.innerHTML = '';

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    pdfContainer.appendChild(canvas);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render({ ...renderContext }).promise;

    const annotations = await page.getAnnotations();

    annotations.forEach((annotation) => {
      // 'Tx' is for text fields
      const rect = annotation.rect;

      /**
       * @type {string}
       */
      const fieldName =
        annotation.fieldName || annotation.alternativeText || '';

      if (!fieldName) {
        return;
      }

      fields.push({ name: fieldName });

      context.strokeStyle = 'black';
      context.lineWidth = 1;
      context.strokeRect(
        rect[0],
        viewport.height - rect[3],
        rect[2] - rect[0],
        rect[3] - rect[1]
      );

      context.fillStyle = 'rgba(0, 0, 0, 1)';
      context.fillRect(
        rect[0],
        viewport.height - rect[3],
        rect[2] - rect[0],
        rect[3] - rect[1]
      );

      if (annotation.fieldType === 'Tx') {
        context.fillStyle = 'white';
        context.font = `10px Arial`;

        context.fillText(
          fieldName,
          rect[0] + 2,

          // I don't know why this particular calculation works, it just does
          (viewport.height - rect[1] + (viewport.height - rect[3])) / 2 + 4
        );
      }
    });
  }
  if (fields.length) {
    createTextInputFields(fields);
  }
}

/**
 *
 * @param {Response} response
 * @returns {Promise<string>}
 */
async function processErrorMessage(response) {
  const error = JSON.parse(await response.text());
  return error.message;
}
