import { dgraph } from './db'
import routes from './routes'

import Fastify from 'fastify'

const PORT = 3000

const fastify = Fastify({ logger: true })

fastify.register(dgraph)
fastify.register(routes)

const start = async () => {
  try {
    await fastify.listen(PORT)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

