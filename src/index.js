import 'core-js/stable'
import 'regenerator-runtime/runtime'

import Koa from 'koa'
import koalogger from 'koa-logger'
import cors from '@koa/cors'

import koaBody from 'koa-body'
import Redis from 'ioredis'
import AJV from 'ajv'
import compress from 'koa-compress'
import error from 'koa-json-error'
import ratelimit from 'koa-ratelimit'
import session from 'koa-session'
import KeyGrip from 'keygrip'
import winston from 'winston'
import Queue from 'bull'
import sendEmailJob from './jobs/send-mail'
import {
  REDIS_CONFIG
} from './config/redis'
import { verify } from 'hcaptcha'
import addFormats from 'ajv-formats'

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

const ajv = new AJV({
  allErrors: true,
  removeAdditional: true
})

addFormats(ajv)

const validate = ajv.compile({
  type: 'object',
  additionalProperties: false,
  required: ['token', 'email', 'message', 'reason'],
  properties: {
    token: {
      type: 'string'
    },
    email: {
      type: 'string',
      format: 'email'
    },
    subject: {
      type: 'string'
    },
    message: {
      type: 'string'
    },
    reason: {
      type: 'string',
      enum: ['feedback', 'general', 'volunteer']
    }
  }
})

const queueOptions = {
  redis: REDIS_CONFIG
}

const sendEmailQueue = new Queue('send-email', queueOptions)

sendEmailQueue.on('completed', (job, result) => {
  logger.info('Email sent')
})

sendEmailQueue.on('error', (job, result) => {
  logger.info('Email sent')
})

sendEmailQueue.process(sendEmailJob)

const app = new Koa()

app.keys = new KeyGrip([process.env.APP_KEY, process.env.APP_KEY_2], 'sha256')

app
  .use(cors())
  .use(koaBody())
  .use(koalogger())
  .use(ratelimit({
    db: new Redis({
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || '127.0.0.1',
      password: process.env.REDIS_PASSWORD
    }),
    duration: 60000,
    errorMessage: 'Contact form limited',
    id: (ctx) => ctx.ip,
    headers: {
      remaining: 'Rate-Limit-Remaining',
      reset: 'Rate-Limit-Reset',
      total: 'Rate-Limit-Total'
    },
    max: 100,
    disableHeader: false,
    whitelist: (ctx) => {
      // some logic that returns a boolean
    },
    blacklist: (ctx) => {
      // some logic that returns a boolean
    }
  }))
  .use(session(app))
  .use(compress({
    filter: (contentType) => {
      return /text/i.test(contentType)
    },
    threshold: 2048,
    flush: require('zlib').Z_SYNC_FLUSH
  }))
  .use(error(err => {
    return {
      status: err.status,
      message: err.message,
      data: null
    }
  }))

app.use(async ctx => {
  const body = ctx.request.body
  const isValid = validate(body)

  if (!isValid) {
    const { message, dataPath } = validate.errors[0]
    ctx.status = 400
    ctx.throw(400, `${dataPath}: ${message}`)
  }

  const { token } = body
  const secret = process.env.HCAPTCHA_SECRET

  await verify(secret, token)

  sendEmailQueue.add({
    template: 'contact',
    message: {
      to: process.env.MAILGUN_RECIPIENT,
      from: body.email,
      replyTo: body.email
    },
    locals: {
      reason: body.reason,
      subject: body.subject,
      message: body.message,
      email: body.email
    }
  })

  ctx.status = 202

  ctx.body = {
    status: ctx.status,
    data: body,
    message: 'Your message is on its way'
  }
})

export default app
