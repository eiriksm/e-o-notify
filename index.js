module.exports = notifier

const nodemailer = require('nodemailer')
var htmlToText = require('nodemailer-html-to-text').htmlToText
var path = require('path')
var templatesDir = path.join(__dirname, 'templates')
const Email = require('email-templates')
var util = require('util')

var config = require.main.require('./notify-config')
if (!config) {
  throw new Error('No config found. Please configure this module.')
}
let transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: config.auth,
});
transporter.use('compile', htmlToText())

function debuglines (data) {
  return util.format('%d [%s]: %s', parseInt(data.timestamp, 10), data.type, data.message)
}

function makeSubject (type, d) {
  var subject = ''
  switch (type) {
    case 'notify-down':
      subject = util.format('Response code %d from %s', Number(d.code), d.site)
      break

    case 'notify-process':
      subject = util.format('Timeout on %s', d.site)
      break

    case 'notify-resource':
      subject = util.format('Resource error on %s', d.site)
      break
  }
  if (d.fixed) {
    subject = 'FIXED: ' + subject
  }
  return subject
}

function notifier (type, data, opts, callback) {
  let email = new Email({
    views: {
      root: templatesDir,
      options: {
        extension: 'ejs'
      }
    },
    transport: transporter
  })
  // Assemble some data.
  var d = {
    site: opts.url,
    code: data.statusCode,
    debugData: data.logs.map(debuglines).join('\n'),
    numbers: data.numbers,
    fixed: data.fixed
  }
  d.subject = makeSubject(type, d)
  email.render(type, d).then(function (h) {
    var attach = false
    if (data.screenshot) {
      attach = true
    }
    var sendData = {
      from: util.format('%s <%s>', config.fromUser, config.fromMail),
      to: opts.email,
      subject: d.subject,
      html: h
    }
    if (attach) {
      sendData.attachments = [
        {
          path: data.screenshot.trim()
        }
      ]
    }
    var _callback = function (err, res) {
      if (err) console.error(err)
      if (callback) {
        callback(err, res)
      } else {
        if (err) {
          console.error(err)
        }
      }
    }
    transporter.sendMail(sendData, _callback)
  })
    .catch(function (e) {
      callback(e)
    })
}
