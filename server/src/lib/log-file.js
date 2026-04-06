import fs from 'fs'
import path from 'path'

const logDir = path.join(process.cwd(), 'logs')
const prefix = 'LOG_LU_'
const suffix = '.txt'

if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}

export class LogFile {
  static files = {}

  static write(name, data, callback) {
    if (LogFile.files[name] == undefined) {
      LogFile.files[name] = new LogFile(name)
    }

    const lf = LogFile.files[name]

    fs.appendFile(lf.path, data, (err) => {
      if (err) {
        console.log('error on append: ', err)
        return
      }

      if (callback) callback(data)
    })
  }

  static read(name, callback) {
    if (LogFile.files[name] == undefined) {
      LogFile.files[name] = new LogFile(name)
    }

    const lf = LogFile.files[name]
    fs.readFile(lf.path, 'utf8', function(err, logData) {
      if (err) {
        if (err.errno && err.errno == -2) {
          fs.appendFile(lf.path, '', {}, (err) => {
            if (err) console.log('error on create file: ', err)

            if (callback) callback('')
          })
          return
        }

        console.log('error on readFile: ', err)
        if (callback) callback('')
        return
      }

      if (callback) callback(logData)
    })
  }

  constructor(name) {
    this._name = name
    this._path = path.join(logDir, prefix + name + suffix)
  }

  get path() {
    return this._path
  }
}