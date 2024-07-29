const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const express = require("express");
const app = require("express")();

app.use(express.json());

app.post("/generate-certificate", (req, res) => {
  generateCertificate(
    req.body.name,req.body.usn,req.body.role,req.body.startDate
  ).then((result) => {
    res.json(result)
  })
  .catch(e => console.log(e))
});

app.listen(process.env.PORT, () => {
  console.log(" server is running ");
});
function generateWatermark(usn) {
  const width = 200; // Width of the image
  const height = 200; // Height of the image
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Set background color
  ctx.fillStyle = "transparent"; // White background
  ctx.fillRect(0, 0, width, height);

  // Draw watermark text
  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // Semi-transparent black
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.fillText(usn.toUpperCase(), 0, 0);

  const base64Image = canvas.toDataURL("image/png");
  return base64Image;
}

async function generateCertificate(name, usn, position, startDate) {
  // Load the HTML template
  const templatePath = path.join(__dirname, "offerletter.ejs");
  const template = fs.readFileSync(templatePath, "utf-8");

  // Render the template with the provided name
  const html = ejs.render(template, {
    name,
    watermark: generateWatermark(usn),
    usn: usn.toUpperCase(),
    position,
    startDate,
  });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html);
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "0px",
      right: "0px",
      bottom: "0px",
      left: "0px",
    },
    scale: 1, // Adjust scale if necessary
    width: "210mm", // A4 width
    height: "297mm",
  });

  await browser.close();
  return pdfBuffer;
}
