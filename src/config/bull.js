import { REDIS_CONFIG } from './redis'

// See: https://optimalbits.github.io/bull/

export const defaultOpts = {
  redis: REDIS_CONFIG
}

export const buildOpts = (options = {}) => {
  return Object.assign({}, defaultOpts, options)
}

const options = buildOpts(defaultOpts)

export default options
