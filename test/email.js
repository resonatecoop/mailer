const nodemailer = require('nodemailer')
const test = require('tape')
const path = require('path')
const mailgun = require('nodemailer-mailgun-transport')
const Email = require('email-templates')

require('dotenv-safe').config({ path: path.join(__dirname, '../.env') })

const viewsDir = path.join(__dirname, '../emails')

const profile = {
  email: 'auggod@resonate.is',
  firstName: 'Augustin',
  nickname: 'auggod'
}

test('should send email', async t => {
  t.plan(1)

  try {
    const email = new Email({
      message: {
        sender: `"Resonate" <${process.env.MAILGUN_SENDER}>`,
        from: 'auggod@resonate.is'
      },
      send: true,
      transport: nodemailer.createTransport(mailgun({
        auth: {
          api_key: process.env.MAILGUN_API_KEY,
          domain: process.env.MAILGUN_DOMAIN
        }
      }))
    })

    await email
      .send({
        message: {
          to: profile.email,
          subject: 'Hello',
          text: 'Hello world'
        }
      })

    t.pass()
  } catch (err) {
    t.end(err)
  }
})

test('should send email using template', async t => {
  t.plan(1)

  try {
    const email = new Email({
      message: {
        from: `"Resonate" <${process.env.MAILGUN_SENDER}>`
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

    await email
      .send({
        template: 'test',
        message: {
          to: profile.email
        },
        locals: {
          name: profile.nickname,
          firstName: profile.firstName
        }
      })

    t.pass()
  } catch (err) {
    t.end(err)
  }
})
