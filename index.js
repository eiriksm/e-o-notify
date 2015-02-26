module.exports = EoNotify;

var Eo = require('../e-o');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var sendmailTransport = require('nodemailer-sendmail-transport');
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
transporter = nodemailer.createTransport(sendmailTransport({
  path: '/usr/sbin/sendmail'
}));
transporter.use('compile', htmlToText());

function debuglines(data) {
  return util.format('%d [%s]: %s', parseInt(data.timestamp, 10), data.type, data.message);
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
      var attach = false;
      if (data.screenshot) {
        attach = true;
      }
      var sendData = {
        from: 'eirik@e-o.no',
        to: opts.email,
        subject: util.format('Response code %d from %s', Number(data.statusCode), opts.url),
        html: h,
      };
      if (attach) {
        sendData.attachments = [
          {
            path: data.screenshot.trim()
          }
        ]
      }
      transporter.sendMail(sendData, function(error, info) {
        if (error) {
          console.log(error);
        }
      });
    });
  });
  return;
}

EoNotify.prototype.log = function() {
  console.log(arguments);
};
