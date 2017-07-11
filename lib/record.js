// Copyright 2016 Yahoo Inc.
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

var Promise = require('bluebird');
var buffer = require('./buffer');
var path = require('path');
var ejs = require('ejs');
var fs = require('fs');
var debug = require('debug')('yakbak:record');
var stream = require('stream');
var zlib = require('zlib');

/**
 * Read and pre-compile the tape template.
 * @type {Function}
 * @private
 */

var render = ejs.compile(fs.readFileSync(path.resolve(__dirname, '../src/tape.ejs'), 'utf8'));

/**
 * Record the http interaction between `req` and `res` to disk.
 * The format is a vanilla node module that can be used as
 * an http.Server handler.
 * @param {http.ClientRequest} req
 * @param {http.IncomingMessage} res
 * @param {String} filename
 * @returns {Promise.<String>}
 */

module.exports = function (req, res, filename) {
  return buffer(res).then(function (body) {
    return decode(Buffer.concat(body), res.headers['content-encoding'])
  }).then(function(body) {
    return render({ req: req, res: res, body: body });
  }).then(function (data) {
    return write(filename, data);
  }).then(function () {
    return filename;
  });
};

function decode(body, encoding) {
  if (encoding === 'gzip') {
    return Promise.fromCallback(function (done) {
      zlib.gunzip(body, done)
    });
  } else {
    return Promise.resolve(body);
  }
}

/**
 * Write `data` to `filename`. Seems overkill to "promisify" this.
 * @param {String} filename
 * @param {String} data
 * @returns {Promise}
 */

function write(filename, data) {
  return Promise.fromCallback(function (done) {
    debug('write', filename);
    fs.writeFile(filename, data, done);
  });
}
