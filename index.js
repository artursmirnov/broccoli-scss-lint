var Filter = require('broccoli-persistent-filter');
var jsStringEscape = require('js-string-escape');
var shell = require('shelljs');
var path = require('path');

require('colors').setTheme({
  info: 'grey',
  warn: 'yellow',
  error: 'red',
  debug: 'blue'
});

ScssLinter.prototype = Object.create(Filter.prototype);
ScssLinter.prototype.constructor = ScssLinter;

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
 *
 * @return {Filter}
 *   A filter object.
 */
function ScssLinter(inputNode, options) {
  if (!(this instanceof ScssLinter)) {
    return new ScssLinter(inputNode, options);
  }

  options = options || {};
  var filter = Filter.call(this, inputNode, {
    annotation: 'SCSS Linter',
    persist: true
  });

  this.options = options;
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key];
    }
  }

  return filter;
}

ScssLinter.prototype.extensions = ['sass', 'scss'];
ScssLinter.prototype.targetExtension = 'lint.scss';

/*
 * Escape errors strings to be valid JS
 * string literals between double or
 * single quotes.
 */
ScssLinter.prototype.escapeErrorString = jsStringEscape;

/*
 * Absolute path to the root of the
 * filter. This is used as part of
 * the persistence strategy.
 *
 * @method baseDir
 *
 * @return {String}
 *   Absolute path to the root of the filter
 */
ScssLinter.prototype.baseDir = function() {
  return __dirname;
};

/*
 * Delegate task to the parent and
 * log any erros that occurred
 * during liniting.
 *
 * @method build
 *
 * @return {Promise}
 *   A promise that resolves when the linting has completed.
 */
ScssLinter.prototype.build = function() {
  var self = this;
  self._errors = [];

  return Filter.prototype.build.call(this).finally(function() {
    var errors = self._errors.join('\n');

    if (errors.length > 0) {
      console.log(self._formatOutput(errors));
    }
  });
};

/*
 * Perform the linting task on each
 * file, creating additional metadata
 * that will not part of the final
 * output. This will be used to pass
 * error information to the post
 * processing method.
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
 *   Results from the linting task.
 */
ScssLinter.prototype.processString = function(content, relativePath) {
  var absolutePath = path.join(this.inputPaths[0], relativePath);
  var result = shell.exec(this._buildCommand(absolutePath, this.options), { silent: true });

  var passed = result.stdout.length <= 0;
  var errors = result.stdout.substring(result.stdout.indexOf(relativePath));

  if (result.code === 2) {
    throw new Error('There are errors in your SCSS files');
  }

  var output = '';
  if (!this.disableTestGenerator) {
    output = this.testGenerator(relativePath, passed, errors);
  }

  return {
    output: output, // Used as the final file contents.
    passed: passed,
    errors: errors
  };
};

/*
 * Log all errors that were found
 * during linting.
 *
 * @param {Object} results
 *   Results from a single linting task.
 *
 * @return {Object}
 *   Results of the post processing.
 */
ScssLinter.prototype.postProcess = function(result) {
  var errors = result.errors;

  if (errors.length > 0) {
    this._logError(errors);
  }

  return result;
};

/*
 * If we're writing tests, then generate
 * the test file as a string.
 *
 * @param {String} relativePath
 *   File name from the bae tree directory.
 *
 * @param {Bool} passed
 *   Has the lint task passed.
 *
 * @param {String} errors
 *   scss-lint error message.
 *
 * @return {String}
 *   Test file.
 */
ScssLinter.prototype.testGenerator = function(relativePath, passed, errors) {
  if (errors) {
    errors = '\\n' + this.escapeErrorString(errors);
  } else {
    errors = '';
  }

  return "" +
    "QUnit.module('JSHint - " + path.dirname(relativePath) + "');\n" +
    "QUnit.test('" + relativePath + " should pass jshint', function(assert) { \n" +
    "  assert.expect(1);\n" +
    "  assert.ok(" + !!passed + ", '" + relativePath + " should pass jshint." + errors + "'); \n" +
    "});\n";
};

/*
 * Convenience method to push an
 * error to the erros array.
 *
 * @param {Object} message
 *   A linting error message.
 */
ScssLinter.prototype._logError = function(message) {
  this._errors.push(message);
};

/*
 * Construct the scss-lint command
 * from the options passed to this
 * plugin.
 *
 * @param {String} absolutePath
 *   The absolute path to the file to be linted.
 *
 * @param {Object} options
 *   Options for the scss-lint command.
 *
 * @return {String}
 *   Full scss-lint command.
 */
ScssLinter.prototype._buildCommand = function(absolutePath, options) {
  var parts = ['scss-lint', absolutePath];

  options = options || {};
  if (options.bundleExec) {
    parts.unshift('bundle', 'exec');
  }

  delete options.bundleExec;

  Object.keys(options).forEach(function(key) {
    parts.push('--' + key);
    parts.push(options[key]);
  });

  return parts.join(' ');
};

/*
 * Apply colour and formatting to
 * the scss-lint error messages.
 *
 * @param {Object} message
 *   A linting error message.
 *
 * @return {String}
 *   Final formatted error message to be printed to the console.
 */
ScssLinter.prototype._formatOutput = function(message) {
  var output = message || '';

  output = output.split('\n').map(function(error) {
    var parts = error.match(/(.*:\d+)\s(\[\w+\])(.*)/i);
    if (parts && parts.length >= 3 && Array.isArray(parts)) {
      var message = {
        source: '[scss-lint]',
        file: parts[1].trim().info,
        description: parts[3].trim()
      };

      if (parts[2].trim() === '[W]') {
        message.description = message.description.warn;
      }

      if (parts[2].trim() === '[E]') {
        message.description = message.description.error;
      }

      return message.source + ' ' + message.file + ' - ' + message.description;
    } else {
      return error;
    }
  }).filter(function(item) {
    return !!item;
  }).join('\r\n');

  return output ? '\r\n' + output : '';
};

module.exports = ScssLinter;
