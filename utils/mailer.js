import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import ErrorResponse from "./errorResponse.js";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  }
});

const compileTemplate = (templatePath, data) => {
  const source = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(source);
  return template(data);
};

export const sendWelcomeEmail = (to, templateName, data) => {
  const templatePath = `./templates/${templateName}.handlebars`;
  data.url = process.env.NODE_ENV === 'production' ? process.env.PROD_CLIENT_URL : process.env.DEV_CLIENT_URL;

  const mailOptions = {
    from: process.env.NODEMAILER_FROM,
    to,
    subject: "NR Accounting has invited you to use Doc-Hub",
    html: compileTemplate(templatePath, data),
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        reject(new ErrorResponse(error.message, 500));
      } else {
        resolve(info);
      }
    });
  });
};