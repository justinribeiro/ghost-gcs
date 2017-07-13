// # Google Cloud Storage Image Storage module
// A module for storing images on Google Cloud Storage

'use strict';

var serveStatic = require('express').static,
    fs = require('fs-extra'),
    os = require('os'),
    path = require('path'),
    util = require('util'),
    Promise = require('bluebird'),
    errors = require('../../../core/server/errors'),
    config = require('../../../core/server/config'),
    utils = require('../../../core/server/utils'),
    BaseStore = require('../../../core/server/storage/base'),
    storage = require('@google-cloud/storage'),
    uuidv4 = require('uuid').v4,
    remove = Promise.promisify(fs.remove);

function GCSFileStore(config) {
    BaseStore.call(this);
    this._options = config || {};

    var gcs = storage({
        projectId: this._options.projectId,
        keyFilename: this._options.keyFilename,
    });
    this._bucket = gcs.bucket(this._options.bucket);
}

util.inherits(GCSFileStore, BaseStore);

// ### Save
// Saves the image to storage (google cloud storage)
// - image is the express image object
// - targetDir is a location on the filesystem to save the image, this is ignored.
// - returns a promise which ultimately returns the full url to the uploaded image
GCSFileStore.prototype.save = function (image, targetDir) {
    if (!this._options) {
        return Promise.reject('Google Cloud Storage is not configured.');
    }

    var _self = this,
        gcsPath = 'https://' + this._options.bucket + '.storage.googleapis.com/',
        targetFilename;
    targetDir = this.getTargetDir('images/'); // targetDir is set to a filesystem path, no good.

    return this.getUniqueFileName(this, image, targetDir).then(function (filename) {
        targetFilename = filename;
        return new Promise(function (resolve, reject) {
            var options = {
                destination: targetFilename
            };
            _self._bucket.upload(image.path, options, function(err, file) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(file);
            });
        });
    }).then(function (file) {
        return new Promise(function (resolve, reject) {
            file.makePublic(function (err, apiResponse) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(apiResponse);
            });
        });
    }).then(function () {
        return gcsPath + targetFilename;
    }).catch(function (e) {
        errors.logError(e);
        return Promise.reject(e);
    });
};

// ### Exists
// Checks if a key is in use in the bucket.
// - filename is the file key in the bucket.
// - returns a promise which will resolve if a key exists.
GCSFileStore.prototype.exists = function (filename) {
    var _self = this,
        file = _self._bucket.file(filename);

    return new Promise(function (resolve, reject) {
        file.exists(function (err, exists) {
            if (err) {
                reject(err);
                return;
            }
            resolve(exists);
        });
    });
};

// middleware for serving the files
GCSFileStore.prototype.serve = function (options) {
    options = options || {};

    // CASE: serve themes
    // serveStatic can't be used to serve themes, because
    // download files depending on the route (see `send` npm module)
    if (options.isTheme) {
        return function downloadTheme(req, res, next) {
            var themeName = options.name,
                themePath = path.join(config.paths.themePath, themeName),
                zipName = themeName + '.zip',
                // store this in a unique temporary folder
                zipBasePath = path.join(os.tmpdir(), utils.uid(10)),
                zipPath = path.join(zipBasePath, zipName),
                stream;

            Promise.promisify(fs.ensureDir)(zipBasePath)
                .then(function () {
                    return Promise.promisify(utils.zipFolder)(themePath, zipPath);
                })
                .then(function (length) {
                    res.set({
                        'Content-disposition': 'attachment; filename={themeName}.zip'.replace('{themeName}', themeName),
                        'Content-Type': 'application/zip',
                        'Content-Length': length
                    });

                    stream = fs.createReadStream(zipPath);
                    stream.pipe(res);
                })
                .catch(function (err) {
                    next(err);
                })
                .finally(function () {
                    remove(zipBasePath);
                });
        };
    } else {
        // CASE: serve images
        // For some reason send divides the max age number by 1000
        // Fallthrough: false ensures that if an image isn't found, it automatically 404s
        return serveStatic(config.paths.imagesPath, {maxAge: utils.ONE_YEAR_MS, fallthrough: false});
    }
};

GCSFileStore.prototype.delete = function (fileName, targetDir) {
    targetDir = 'images/'; // targetDir is set to a filesystem path, no good.
    var file = this._bucket.file(targetDir + this.getSanitizedFileName(fileName));

    return new Promise(function (resolve, reject) {
        file.delete(function (err, apiResponse) {
            if (err) {
                reject(err);
                return;
            }
            resolve(apiResponse);
        });
    });
};


// ### Generates unique filenames
//
// Given a filename, checks if it's already in use and if so, generates a new
// one. This differs from the filesystem variant in that is minimizes recursion
// using a uuid generator rather than an index. Since we have to deal with
// network latency, this can really slow things down.
//
// For example, if jar-jar-binks.jpg is duplicated to 5 files each appended with
// numerical indexes, 5 requests have to be sent back to back to come to a valid
// filename. Attackers can take advantage of this and cause a denial of service
// attack if the backend does not cancel the requests.
//
// - store is a file store object with an exists method.
// - dir is the location of the file in google cloud storage minus the filename.
// - name is a filename
// - ext is the file extension for the file.
// - i is a recursion counter used in the filesystem variant.
// - returns a promise which will resolve if a filename is determined.
GCSFileStore.prototype.generateUnique = function (store, dir, name, ext, i) {
    var self = this,
        filename,
        append = '';

    if (i) {
        append = '-' + uuidv4(); // Use UUID instead to minimize recursion.
    }

    if (ext) {
        filename = path.join(dir, name + append + ext);
    } else {
        filename = path.join(dir, name + append);
    }

    return store.exists(filename).then(function (exists) {
        if (exists) {
            i = i + 1;
            return self.generateUnique(store, dir, name, ext, i);
        } else {
            return filename;
        }
    });
};

module.exports = GCSFileStore;
