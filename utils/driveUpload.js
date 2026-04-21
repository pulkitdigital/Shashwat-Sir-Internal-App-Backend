const axios = require("axios");

const uploadPdfToDrive = async (fileBuffer, originalName) => {
  const fileBase64 = fileBuffer.toString("base64");

  const response = await axios.post(process.env.GOOGLE_APPS_SCRIPT_URL, {
    fileBase64,
    fileName: `${Date.now()}_${originalName}`,
  });

  if (!response.data.success) {
    throw new Error(response.data.error || "Apps Script upload failed");
  }

  return response.data.url;
};

module.exports = { uploadPdfToDrive };