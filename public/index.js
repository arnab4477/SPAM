// const pdfjsLib = window.pdfjsLib;

document.getElementById('upload').addEventListener('submit', async (e) => {
  e.preventDefault();

  const pdfFile = document.getElementById('pdfFile').files[0];

  const formData = new FormData();
  formData.append('pdf', pdfFile);

  const response = await fetch('/upload', {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    window.location.href = '/view';
  } else {
    alert(await processErrorMessage(response));
  }
});
