import libbetterauth from 'libbetterauth'
import * as msgpackr from 'msgpackr'

const MESSAGE_TYPES = {
  // Server-sent messages
  SERVER_ERROR: 0x0000,

  // 0x001X series - Authentication
  SERVER_AUTHENTICATION_CHALLENGE: 0x0011,
  SERVER_AUTHENTICATION_SUCCESS: 0x0012,
  SERVER_AUTHENTICATION_FAILURE: 0x0013,

  // Client-sent events
  // 0x800X - Authentication
  CLIENT_AUTHENTICATION_CHALLENGE_RESP: 0x8000
}

class SocketClient {
  constructor () {
    const url = new window.URL(window.location.href)
    url.pathname = '/api/v1/connection'
    url.port = '3000'
    url.protocol = 'ws'

    const ws = new window.WebSocket(url.href)
    this.ws = ws
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      console.log('Connection established.')
    }
    ws.onmessage = this.onMessage
  }

  sendMessage (data) {
    console.log('Out:', data)
    this.ws.send(msgpackr.encode(data))
  }

  onMessage = (msg) => {
    const rawData = Buffer.from(msg.data)
    const decoded = msgpackr.decode(rawData)
    console.log('In:', decoded)

    switch (decoded.type) {
      case MESSAGE_TYPES.SERVER_AUTHENTICATION_CHALLENGE: {
        const userID = 'user@email.com'
        // This is just an example, you'd want to derive a secret key after the user enters a password and use that in place of this
        const secretKey = Buffer.from('YOUR_SECRET_KEY', 'base64')

        const [data, signature] = libbetterauth.signObject({
          buf: decoded.challenge
        }, secretKey)

        this.sendMessage({
          type: MESSAGE_TYPES.CLIENT_AUTHENTICATION_CHALLENGE_RESP,
          userID,
          signature: signature,
          timestamp: data.timestamp
        })
        break
      }
      default:
    }
  }
}
