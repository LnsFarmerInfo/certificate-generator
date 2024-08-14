const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const express = require("express");
const app = require("express")();
const nodemailer = require("nodemailer");

app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail", // or any other email service
  auth: {
    user: "lnsfarmerinfo@gmail.com",
    pass: process.env.APP_PASSWORD,
  },
});

async function getFormattedDate() {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString("default", { month: "short" });
  const year = today.getFullYear();

  // Function to get the ordinal suffix
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  // Format the date
  const formattedDate = `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
  return formattedDate;
}

app.post("/generate-certificate", async (req, res) => {
  try{
    const certificateBuffer = await generateCertificate(
      req.body.name,
      req.body.usn,
      req.body.role,
      req.body.startDate,
      getFormattedDate()
    );
  
    const mailOptions = {
      from: "lnsfarmerinfo@gmail.com",
      to: req.body.email,
      subject: "Offer Letter - LNS FarmerInfo LLP",
      text: `Dear ${req.body.name},
  
We’re excited to extend this offer to join our team as an ${req.body.role}! 
Attached, you’ll find the official offer letter with details about your role and start date. We’re thrilled to have you on board and are confident that you’ll make valuable contributions while gaining meaningful experience.
Please review the offer letter and let us know if you have any questions. Once you're ready to proceed, Just reply 'Confirm' to this mail.
  
  Welcome to the team! We look forward to working with you.
  
  Best regards,
  Hiring Team,
  LNS FarmerInfo LLP
  +91 8762944259`,
      attachments: [
        {
          filename: `offerletter_${req.body.usn}.pdf`,
          content: Buffer.from(certificateBuffer),
          encoding: "base64", // optional, but you can specify encoding
        },
      ],
    };
  
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log(info);
        resolve(info);
      }
    });
  
    res.json({message : "certificate generated and sent."});
  }
  catch(e){
    console.log(e)
  }
  
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

async function generateCertificate(name, usn, position, startDate,date) {
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
    date
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
