import fastifyPlugin from 'fastify-plugin'
import { DgraphClientStub, DgraphClient, Operation, Mutation, Request } from 'dgraph-js'
import grpc from 'grpc'
import { map, fromPairs } from 'lodash/fp'
import { promises as fs } from 'fs'

export const dgraph = fastifyPlugin(async (fastify, options) => {
  const clientStub = new DgraphClientStub(
    "localhost:9080",
    grpc.credentials.createInsecure()
  )

  const dgraphClient = new DgraphClient(clientStub)

  const dropOp = new Operation()
  dropOp.setDropAll(true)
  await dgraphClient.alter(dropOp)

  const schema = `
    id: int @index(int) .
    name: string @lang .
    connection: [uid] @reverse .
  `
  const op = new Operation()


  op.setSchema(schema)
  await dgraphClient.alter(op)

  const peopleFile = await fs.readFile('data/person.txt', 'utf8')

  const relationshipFile = await fs.readFile('data/relationship.txt', 'utf8')

  const relationships = fromPairs(map(relationship => {
    const [id, connections] = relationship.split(':')
    return [parseInt(id), map(connection => {
      const conn = parseInt(connection)
      return { uid: `_:${conn}` }
    })(connections.split(','))]
  })(relationshipFile.split(/\r?\n/)))

  const people = map(person => {
    const [ id, name ] = person.split(/\t/)
    return {
      uid: `_:${id}`, id, name, connection: relationships[id]
    }
  })(peopleFile.split(/\r?\n/))

  const txn = dgraphClient.newTxn()

  const mu = new Mutation()
  mu.setSetJson(people)

  const response = await txn.mutate(mu)

  await txn.commit()

  fastify.decorate('dgraph', dgraphClient)
})