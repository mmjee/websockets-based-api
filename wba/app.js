module.exports = async (fastify) => {
  // Declare a route
  fastify.get('/', async (req, reply) => {
    return { hello: 'world' }
  })
}
