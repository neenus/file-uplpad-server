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

export const sendEmail = (to, templateName, data) => {
  const templatePath = `./templates/${templateName}.handlebars`;
  data.url = process.env.NODE_ENV === 'production' ? process.env.PROD_CLIENT_URL : process.env.DEV_CLIENT_URL;
  const subject = templateName === 'welcome-email' ? 'NR Accounting has invited you to use Doc-Hub' : 'Doc-Hub Password Reset';

  const mailOptions = {
    from: process.env.NODEMAILER_FROM,
    to,
    subject: subject,
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

// Send email to notify admin of new upload
export const notifyAdmin = (files, user) => {
  const template = `./templates/admin-notification.handlebars`;
  const data = {
    userName: user.name,
    userDir: user.dir,
    userId: user._id,
    files: !Array.isArray(files) ? [files].map(file => file.name) : files.map(file => file.name),
  }

  const mailOptions = {
    from: process.env.NODEMAILER_FROM,
    to: process.env.NODEMAILER_ADMIN,
    subject: `DOC-HUB New file uploaded by ${user.name}`,
    html: compileTemplate(template, data),
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

// Send email to notify admin of infected files
export const notifyAdminVirus = (infectedFiles, user) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: process.env.NODEMAILER_ADMIN,
      subject: `DOC-HUB Virus detected in files uploaded by ${user.name}`,
      html: `<p>DOC-HUB has detected a virus in the following files uploaded by ${user.name}:</p><p>${infectedFiles.join(', ')}</p>`,
    }, function (error, info) {
      if (error) {
        reject(new ErrorResponse(error.message, 500));
      } else {
        resolve(info);
      }
    });
  });
}