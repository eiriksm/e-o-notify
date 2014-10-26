module.exports = EoNotify;

var Eo = require('../e-o');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var htmlToText = require('nodemailer-html-to-text').htmlToText;
var path = require('path');
var templatesDir = path.join(__dirname, 'templates');
var emailTemplates = require('email-templates');
var util = require('util');
var fs = require('fs');

var config = require('./config');
if (!config) {
  throw new Exception('No config found. Please configure this module.');
}
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: config.gmailuser,
    pass: config.gmailpass
  }
});
transporter.use('compile', htmlToText());

function debuglines(data) {
  return util.format('[%s], %s', data.type, data.message);
}

function EoNotify(type, data, opts) {
  emailTemplates(templatesDir, function(err, template) {
    // Assemble some data.
    var d = {
      site: opts.url,
      code: data.statusCode,
      debugData: data.logs.map(debuglines).join(''),
      numbers: data.numbers
    };
    template(type, d, function(err, h, t) {
      if (err) {
        console.log(err);
        return;
      }
      transporter.sendMail({
        from: 'eirik@e-o.no',
        to: opts.email,
        subject: util.format('Response code %d from %s', Number(data.statusCode), opts.url),
        html: h,
        attachments: [
          {
            path: data.screenshot.trim()
          }
        ]
      }, function(error, info) {
        if (error) {
          console.log(error);
        }
        else {
          console.log('Message sent: ' + info.response);
        }
      });
    });
  });
  return;
}

EoNotify.prototype.log = function() {
  console.log(arguments);
};
