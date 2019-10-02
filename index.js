/* eslint-disable */

const AWS = require('aws-sdk');
const BaseStore = require('ghost-storage-base');
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');

const readFileAsync = fp => {
  return new Promise((resolve, reject) => { 
     fs.readFile(fp, (err, data) => { 
        if(err) {
          reject(err) 
        } else { 
          resolve(data) 
        }
     })
  })
}

const stripLeadingSlash = s =>
  s.indexOf('/') === 0 ? s.substring(1) : s



class Store extends BaseStore {
  constructor (config = {}) {
    super(config)

    const {
      accessKeyId,
      assetHost,
      bucket,
      pathPrefix,
      region,
      secretAccessKey,
      endpoint,
      serverSideEncryption,
      forcePathStyle,
      signatureVersion,
      acl
    } = config

    /*
    *  Compatible with the aws-sdk's default environment variables
    *  but with precedence of specific storage
    */
    this.accessKeyId   =        accessKeyId ||     process.env.AWS_ACCESS_KEY_ID
    this.secretAccessKey =      secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY
    this.region =               region ||          process.env.AWS_DEFAULT_REGION;
    this.bucket =               bucket;
    
    
    /**
     *  Optional configurations
     */
    // hostWithPath
    this.host =                 (assetHost || `https://s3${this.region === 'us-east-1' ? '' : `-${this.region}`}.amazonaws.com/${this.bucket}`);

    this.pathPrefix =           stripLeadingSlash(pathPrefix || '')
    this.endpoint =             endpoint || ''
    this.serverSideEncryption = serverSideEncryption || ''
    this.s3ForcePathStyle =     Boolean(forcePathStyle) || false
    this.signatureVersion =     signatureVersion || 'v4'
    this.acl =                  acl || 'public-read'
  }

  delete (fileName, targetDir) {
    const directory = targetDir || this.getTargetDir(this.pathPrefix)

    return this.s3()
      .deleteObject({
        Bucket: this.bucket,
        Key: stripLeadingSlash(path.join(directory, fileName))

      }).promise().then(() => true).catch(err => false)
  }

  exists (fileName, targetDir) {
  
    return this.s3()
      .getObject({
        Bucket: this.bucket,
        Key: stripLeadingSlash(path.join(targetDir, fileName))

      }).promise().then(() => true).catch((err) =>  false)
  }

  s3 () {
    const s3RequestParams = {
      bucket: this.bucket,
      region: this.region,
      signatureVersion: this.signatureVersion,
      s3ForcePathStyle: this.s3ForcePathStyle
    }

    // Set credentials only if provided, falls back to AWS SDK's default provider chain
    if (this.accessKeyId && this.secretAccessKey) {
      s3RequestParams.credentials = new AWS.Credentials(this.accessKeyId, this.secretAccessKey)
    }

    if (this.endpoint !== '') {
      s3RequestParams.endpoint = this.endpoint
    }

    return new AWS.S3(s3RequestParams)
  }
  
  _normalizeFilename(fullFileName) {
    const tokens = stripLeadingSlash(fullFileName).split('/')
    const filename  = tokens.pop()
    
    
    return [ 
      ...tokens, 
      slugify(filename, { lower: true }) 
    ].join('/')
  }

  save (tmpFile, targetDir) {

    const directory = targetDir || this.getTargetDir(this.pathPrefix)

    return Promise.all([ 
        this.getUniqueFileName(tmpFile, directory), 
        readFileAsync(tmpFile.path)
      ])
      .then(( [fileName, buffer ]) => {

        debugger
        const normalizedFilename = this._normalizeFilename(fileName)

        /**
         * it is the path without any context (prefix, ghostPath or cdn path prefix)
         */
        const ghostPath = normalizedFilename.replace(this.pathPrefix, '')

        const s3RequestParams = {
          ACL: this.acl,
          Body: buffer,
          Bucket: this.bucket,
          CacheControl: `max-age=${30 * 24 * 60 * 60}`,
          ContentType: tmpFile.type,
          Key: normalizedFilename
        }

        if (this.serverSideEncryption !== '') {
          config.ServerSideEncryption = this.serverSideEncryption
        }

        return this.s3().putObject(s3RequestParams).promise().then(data => {
            return [
              this.host.replace(/\/$/, ''),
              ghostPath.replace(/^\//, '')
            ].join('/')
        })
    })
  }

  serve () {
    return (req, res, next) => {
      
      const key = stripLeadingSlash(this.pathPrefix + req.path).replace(/\/\//g, '/'); 
      
      this.s3()
        .getObject({
          Bucket: this.bucket,
          Key: key,
        })
        .on('httpHeaders', (statusCode, headers, response) => {
          res.set(headers) 
        })
        .createReadStream()
        .on('error', err => {
          res.status(404)
          next(err)
        })
        .pipe(res)
      }
  }

  read(options = {}) {
      // remove trailing slashes
      let path = (options.path || '').replace(/\/$|\\$/, '')

      // check if path is stored in s3 handled by us
      if (!path.startsWith(this.host)) {
        // try get in fileSystem
        new Error(`${path} is not stored in s3`)
      }

      path = path.substring(this.host.length)

      return this.s3()
        .getObject({
          Bucket: this.bucket,
          Key: stripLeadingSlash(path)
        }).promise()
        .then(data => data.Body);
  }
}

module.exports = Store
