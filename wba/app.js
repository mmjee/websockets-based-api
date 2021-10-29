const { promisify } = require('util')
const crypto = require('crypto')

const fastifyWebsockets = require('fastify-websocket')
const msgpackr = require('msgpackr')
const libbetterauth = require('libbetterauth')

const { User, initialize } = require('wba/models')

// Hopefully you'll keep this in its own file
const ERRORS = {
  INVALID_DATA: 1,
  NOT_AUTHENTICATED_YET: 2,
  ALREADY_AUTHENTICATED: 3
}

const MESSAGE_TYPES = {
  // Server-sent messages
  SERVER_ERROR: 0x0000,

  // 0x001X series - Authentication
  SERVER_AUTHENTICATION_CHALLENGE: 0x0011,
  SERVER_AUTHENTICATION_SUCCESS: 0x0012,
  SERVER_AUTHENTICATION_FAILURE: 0x0013,

  // Client-sent events
  CLIENT_AUTHENTICATION_CHALLENGE_RESP: 0x8000
}

const randomBytes = promisify(crypto.randomBytes)

class Connection {
  constructor (ws) {
    this.ws = ws

    this.onMessage = this.onMessage.bind(this)
    this.onClose = this.onClose.bind(this)
    this.wsSend = promisify(this.ws.socket.send.bind(this.ws.socket))

    this.ws.on('message', this.onMessage)
    this.ws.on('close', this.onClose)

    this.isAuthenticated = false
    this.userID = null
  }

  simpleSend (data) {
    return new Promise((resolve, reject) => {
      this.wsSend(msgpackr.encode(data), {
        binary: true
      }, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  async initialize () {
    this.authChallengeBuf = await randomBytes(24)
    await this.simpleSend({
      type: MESSAGE_TYPES.SERVER_AUTHENTICATION_CHALLENGE,
      challenge: this.authChallengeBuf
    })
  }

  async onMessage (message, isBinary) {
    if (!isBinary) {
      await this.simpleSend({
        type: MESSAGE_TYPES.SERVER_ERROR,
        errorCode: ERRORS.INVALID_DATA
      })
      return
    }

    let data
    try {
      data = msgpackr.decode(message)
    } catch (e) {
      await this.simpleSend({
        type: MESSAGE_TYPES.SERVER_ERROR,
        errorCode: ERRORS.INVALID_DATA
      })
      return
    }

    if (!data.type && !Number.isFinite(data.type)) {
      await this.simpleSend({
        type: MESSAGE_TYPES.SERVER_ERROR,
        errorCode: ERRORS.INVALID_DATA
      })
      return
    }

    if (!this.isAuthenticated) {
      if (data.type === MESSAGE_TYPES.CLIENT_AUTHENTICATION_CHALLENGE_RESP) {
        try {
          await this.handleAuthentication(data)
        } catch (e) {
          await this.simpleSend({
            type: MESSAGE_TYPES.SERVER_AUTHENTICATION_FAILURE,
            message: e.message
          })
        }
      } else {
        await this.simpleSend({
          type: MESSAGE_TYPES.SERVER_ERROR,
          errorCode: ERRORS.INVALID_DATA
        })
      }
      return
    }

    // Only handle CSEs
    switch (data.type) {
      case MESSAGE_TYPES.CLIENT_AUTHENTICATION_CHALLENGE_RESP:
        await this.simpleSend({
          type: MESSAGE_TYPES.SERVER_ERROR,
          errorCode: ERRORS.ALREADY_AUTHENTICATED
        })
        break
    }
  }

  async handleAuthentication (msg) {
    const {
      userID,
      signature
    } = msg
    const user = await User.findById(userID)

    if (!user) {
      await this.simpleSend({
        type: MESSAGE_TYPES.SERVER_AUTHENTICATION_FAILURE,
        message: 'User not found'
      })
      return
    }

    const validated = libbetterauth.verifyData(this.authChallengeBuf, signature, user.publicKey)
    if (!validated) {
      await this.simpleSend({
        type: MESSAGE_TYPES.SERVER_AUTHENTICATION_SUCCESS,
        user
      })
      return
    }

    this.isAuthenticated = true
    this.userID = userID
  }
}

module.exports = async (fastify) => {
  await initialize()

  fastify.register(fastifyWebsockets)
  fastify.get('/api/v1/connection', { websocket: true }, (connection) => {
    const c = new Connection(connection)
    c.initialize().catch(e => c.onClose(e))
  })
}
