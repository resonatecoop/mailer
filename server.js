require('dotenv-safe').config()

const winston = require('winston')

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
const port = process.env.PORT || 3000
const app = require('.') // koa app

app.listen(port, () => logger.info(`Server listening on port ${port}`))
