import { isInteger, map, maxBy, minBy } from 'lodash/fp'

const getConnections = async ({ dgraphClient }, { id, degree }) => {
  const query = `
    {
      var(func: eq(id, ${id})) @recurse(depth: ${degree}, loop: false) @ignorereflex {
        uid,
        name,
        id,
        c as connection @normalize
      }

      q(func: uid(c), orderasc: id) {
        name,
        id
      }
    }
  `

  const res = await dgraphClient.newTxn().query(query)
  const ppl = res.getJson()

  return ppl
}

export default async (fastify, options) => {
  const dgraphClient = fastify.dgraph

  fastify.get('/', async (request, reply) => {
    return 'welcome: see README.md'
  })

  // returns person by id. includes 1st degree connections
  fastify.get('/user/:id', async (request, reply) => {
    const query = `query all($a: int) {
      all(func: eq(id, $a)) {
        id,
        name,
        connection {
          id,
          name
        }
      }
    }`

    const vars = { $a: request.params.id }
    const res = await dgraphClient.newTxn().queryWithVars(query, vars)
    const ppl = res.getJson()

    return ppl.all
  })

  // returns array of connected people to user id. takes optional query parameter "degree"
  // default is equivalent to /user/:id/connections?degree=1
  fastify.get('/user/:id/connections', {
    schema: {
      querystring: {
        degree: { type: 'integer', minimum: 1 }
      }
    }
  },async (request, reply) => {
    const { id } = request.params
    const { degree = 1 } = request.query

    const ppl = await getConnections({ dgraphClient }, { id, degree })

    return { connections: ppl.q, totalConnections: ppl.q.length }
  })

  // returns array of people connecting two provided ids. requires both from parameter and to parameter
  // ex. /introduce?from=34&to=3
  fastify.get('/introduce', {
    schema: {
      querystring: {
        to: { type: 'integer' },
        from: { type: 'integer' }
      }
    }
  },async (request, reply) => {
    const { to, from } = request.query
    console.log({ to, from })
    if (!isInteger(to)) throw new Error('MISSING_TO_ID')
    if(!isInteger(from)) throw new Error('MISSING_FROM_ID')
    const query = `
    {
       A as var(func: eq(id, ${from}))
       B as var(func: eq(id, ${to}))

       path as shortest(from: uid(A), to: uid(B)) {
        connection
       }
       path(func: uid(path)) {
         id,
         name
       }
      }
    `

    const res = await dgraphClient.newTxn().query(query)
    const result = res.getJson()

    return result.path
  })

  // returns array of people in common provided two ids. requires both a and b.
  // optionally accepts degree, defaults to first degree
  // ex /common/3/34?degree=2
  fastify.get('/common/:a/:b', {
    schema: {
      querystring: {
        degree: { type: 'integer', minimum: 1 }
      }
    }
  }, async (request, reply) => {
    const { a, b } = request.params
    const { degree = 1 } = request.query
    const query = `
    {
      var(func: eq(id, ${a})) @recurse(depth: ${degree}, loop: false) @ignorereflex {
        uid,
        name,
        id,
        AC as connection @normalize
      }

      var(func: eq(id, ${b})) @recurse(depth: ${degree}, loop: false) @ignorereflex {
        uid,
        name,
        id,
        BC as connection @normalize
      }

      common(func: uid(AC)) @filter(uid(BC)) {
        name,
        id
      }
    }
    `

    const res = await dgraphClient.newTxn().query(query)
    const result = res.getJson()

    return { common: result.common, numberInCommon: result.common.length }
  })

  // returns an object in the form, accepts degree, defaults to second degree
  // { min: person object (including #connections), max: person object(including #connections)}
  // ex /min-max?degree=2
  fastify.get('/min-max', {
    schema: {
      querystring: {
        degree: { type: 'integer', minimum: 1 }
      }
    }
  }, async (request, reply) => {
    const { degree = 2 } = request.query
    const query  = `query all() {
      all(func: has(id), orderasc: id) {
        id,
        name
      }
    }
    `

    const res = await dgraphClient.newTxn().query(query)
    const result = res.getJson()

    const peopleWithConns = await Promise.all(map(async person => {
      const connections = await getConnections({ dgraphClient }, { id: person.id, degree })
      return Object.assign({}, person, {
        connections: connections.q.length
      })
    })(result.all))

    return { max: maxBy('connections')(peopleWithConns), min: minBy('connections')(peopleWithConns) }
  })

}