import winston from 'winston'
import path from 'path'
import nodemailer from 'nodemailer'
import mailgun from 'nodemailer-mailgun-transport'
import Email from 'email-templates'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'contact' },
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    })
  ]
})

const viewsDir = path.join(__dirname, '../../emails')

const sendMail = async (job) => {
  try {
    const email = new Email({
      message: {
        sender: process.env.MAILGUN_SENDER
      },
      juice: true,
      send: true,
      juiceResources: {
        preserveImportant: true,
        webResources: {
          relativeTo: path.resolve(viewsDir)
        }
      },
      transport: nodemailer.createTransport(mailgun({
        auth: {
          api_key: process.env.MAILGUN_API_KEY,
          domain: process.env.MAILGUN_DOMAIN
        }
      }))
    })

    logger.info('Ready to send email')

    await email.send({
      template: job.data.template,
      message: job.data.message,
      locals: job.data.locals
    })

    logger.info('Email sent')

    return Promise.resolve()
  } catch (err) {
    console.log(err)
    return Promise.reject(err)
  }
}

export default sendMail
