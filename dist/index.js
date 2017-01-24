/* jshint node: true */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var Filter = require('broccoli-persistent-filter');
var md5Hex = require('md5-hex');
var stringify = require('json-stable-stringify');
var linter = require('sass-lint');
var path = require('path');
var jsStringEscape = require('js-string-escape');

/*
 * ScssLinter constructor. From here we
 * call the base filter class.
 *
 * @mathod ScssLinter
 *
 * @param {BroccoliNode} inputNode
 *   Broccoli input tree.
 *
 * @param {Object} options
 *   Options to be passed to the linter.
 */
function ScssLinter(inputNode) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (typeof inputNode === 'undefined' || (typeof inputNode === 'undefined' ? 'undefined' : _typeof(inputNode)) !== 'object') {
    throw new Error('Invalid input node.');
  }

  // If this was called on the object then create
  // a new ScssLinter instance.
  if (!(this instanceof ScssLinter)) {
    return new ScssLinter(inputNode, options);
  }

  // Persist options to be passed to sass-lint.
  this.options = options;

  // Call the parent prototype function.
  Filter.call(this, inputNode, {
    annotation: 'SCSS Linter',
    persist: true
  });

  // Configuration options.
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = Object.keys(this.options)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var key = _step.value;

      this[key] = this.options[key];
    }

    // Test generators.
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  if (typeof this.testGenerator === 'string') {
    this.testGenerator = require('./test-generators')[this.testGenerator];
    if (!this.testGenerator) {
      throw new Error('Could not find \'' + this.testGenerator + '\' test generator.');
    }
  }

  if (this.testGenerator) {
    this.targetExtension = 'sass-lint-test.js';
  }
}

/*
 * Extend the plugin prototype.
 */
ScssLinter.prototype = Object.create(Filter.prototype);
ScssLinter.prototype.constructor = ScssLinter;

/*
 * Supported extensions for the plugin.
 */
ScssLinter.prototype.extensions = ['sass', 'scss'];
ScssLinter.prototype.targetExtension = 'scss';

/*
 * Escape errors strings to be valid JS
 * string literals between double or
 * single quotes.
 */
ScssLinter.prototype.escapeErrorString = jsStringEscape;

/*
 * Absolute path to the root of the filter
 * This is used as part of the persistence
 * strategy.
 *
 * @method baseDir
 *
 * @return {String}
 *   Absolute path to the root of the filter
 */
ScssLinter.prototype.baseDir = function () {
  return path.resolve(__dirname, '..'); // package.json is in the parent directory.
};

/*
 * A more robust cache key is returned
 * using not only the cotents of the
 * file and it's path, but the specific
 * plugin configuration. Therefore if the
 * config changed then the file becomes
 * invalidated.
 *
 * @method cacheKeyProcessString
 *
 * @param {String} content
 *   The file's contents.
 *
 * @param {String} relativePath
 *   The relative path to the file on disk.
 *
 * @return {String}
 *   A digest string to be used as the cache key.
 */
ScssLinter.prototype.cacheKeyProcessString = function (content, relativePath) {
  function functionStringifier(key, value) {
    if (typeof value === 'function') {
      return value.toString();
    }

    return value;
  }

  return md5Hex([content, relativePath, stringify(this.options, { replacer: functionStringifier }), stringify(this.getConfig())]);
};

/*
 * Perform the linting task on each file,
 * creating additional metadata that will
 * not be part of the final output. This
 * will be used to pass error information
 * to the post processing method.
 *
 * @method processString
 *
 * @param {String} content
 *   Content of the file.
 *
 * @param {String} relativePath
 *   File name from the bae tree directory.
 *
 * @return {Object}
 *   Cacheable object containing the results from the linting task.
 */
ScssLinter.prototype.processString = function (content, relativePath) {
  var report = this.lintText(content, relativePath);
  var cacheObject = { report: report, output: content };

  if (this.testGenerator && Array.isArray(report.messages)) {
    cacheObject.output = this.testGenerator(relativePath, report.messages, report);
  }

  return cacheObject;
};

/*
 * Log all errors that were found during
 * linting. This method will throw an
 * exception if the warning count exceeds
 * the predefined maximum.
 *
 * @method postProcess
 *
 * @param {Object} results
 *   Results from a single linting task. This consists of the linting report and the original output.
 *
 * @return {Object}
 *   Results of the post processing.
 */
ScssLinter.prototype.postProcess = function (_ref) {
  var report = _ref.report,
      output = _ref.output;

  if (report.errorCount || report.warningCount) {
    this.outputResults([report]);
  }

  return { output: output };
};

/*
 * Call upon sass-lint to lint the content
 * of a specific file.
 *
 * @method lintText
 *
 * @param {String} content
 *   Content of the file.
 *
 * @param {String} relativePath
 *   File name from the bae tree directory.
 *
 * @return {Object}
 *   Results from the linting task.
 */
ScssLinter.prototype.lintText = function (content, relativePath) {
  var report = linter.lintText({
    text: content,
    format: path.extname(relativePath).replace('.', ''),
    filename: relativePath
  }, this.options, this.config);

  return report;
};

/*
 * Output the results whether this be
 * straight to the console/stdout or to
 * a file.
 *
 * Passes results to the format function
 * to ensure results are output in the
 * chosen format as expressed in the
 * configuration.
 *
 * @method outputResults
 *
 * @param {Object} report
 *   Results from the linting task.
 *
 * @return {Object}
 *   Results from the linting task.
 */
ScssLinter.prototype.outputResults = function (reports) {
  linter.outputResults(reports, this.options, this.config);
  return reports;
};

/*
 * Return the configuration file having
 * been merged with any runtime
 * configuration variables passed in by
 * the build pipeline.
 *
 * Here this is used to create a more
 * robust cache key and to ignore files
 * that should not be linted.
 *
 * @method getConfig
 *
 * @return {Object}
 *   Configuration object used by sass-lint.
 */
ScssLinter.prototype.getConfig = function () {
  return linter.getConfig(this.options, this.config);
};

module.exports = ScssLinter;