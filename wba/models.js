const mongoose = require('mongoose')

exports.User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  publicKey: { type: Buffer, minlength: 32, maxlength: 32, required: true }
}))

exports.initialize = function initialize () {
  console.log('Connecting to MongoDB.')
  if (process.env.NODE_ENV !== 'production') {
    mongoose.set('debug', true)
  }
  return mongoose.connect(process.env.WBA_MONGODB_URL || 'mongodb://127.0.0.1:29001/wba').catch(e => {
    console.log('Caught err during MongoDB connection:', e)
    console.log('Exiting.')
    process.exit(1)
  }).then(k => console.log('Done connecting.'))
}
