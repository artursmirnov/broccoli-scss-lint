/* jshint node: true */
'use strict';

var jsStringEscape = require('js-string-escape');

/*
 * Format error messages into a readable
 * string.
 *
 * @method render
 *
 * @param {Array} errors
 *   An array of error message objects.
 *
 * @return {String}
 *   A concatenated string of formatted error messages.
 */
function render(errors) {
  return errors.map(function renderLine(error) {
    return error.line + ':' + error.column + ' - ' + error.message + ' (' + error.ruleId + ')';
  }).join('\n');
}

/*
 * If we're writing tests, then generate
 * the test file as a string.
 *
 * @method testGenerator
 *
 * @param {Function} callback
 *   Callback method used to provide suite specific test code.
 *
 * @return {Function}
 *   Function to be used as our test generator.
 */
function testGenerator(callback) {
  return function (relativePath, errors, results) {
    var passed = !results.errorCount || results.errorCount.length === 0;

    var messages = relativePath + ' should pass sass-lint';

    if (results.messages) {
      messages += '\n\n' + render(results.messages);
    }

    return callback(relativePath, passed, messages);
  };
}

/*
 * If test generation is enabled this method
 * will generate a qunit test that will be
 * included and run by PhantomJS. If there
 * are any errors, the test will fail and
 * print to the console. Otherwise, the test
 * will pass.
 *
 * @method qunitString
 *
 * @param {String} relativePath
 *   The relative path to the file on disk.
 *
 * @param {Boolean} passed
 *   True if the file passed linting, otherwise false.
 *
 * @param {String} messages
 *   A series of error messages for the file.
 *
 * @return {String}
 *   A qunit test string.
 */
function qunitString(relativePath, passed, messages) {
  return 'QUnit.module(\'SCSS Lint | ' + jsStringEscape(relativePath) + '\');\n' + 'QUnit.test(\'should pass sass-lint\', function(assert) {\n' + '  assert.expect(1);\n' + '  assert.ok(' + passed + ', \'' + jsStringEscape(messages) + '\');\n' + '});\n';
}

/*
 * If test generation is enabled this method
 * will generate a mocha test that will be
 * included and run by PhantomJS. If there
 * are any errors, the test will fail and
 * print to the console. Otherwise, the test
 * will pass.
 *
 * @method mochaString
 *
 * @param {String} relativePath
 *   The relative path to the file on disk.
 *
 * @param {Boolean} passed
 *   True if the file passed linting, otherwise false.
 *
 * @param {String} messages
 *   A series of error messages for the file.
 *
 * @return {String}
 *   A mocha test string.
 */
function mochaString(relativePath, passed, messages) {
  var output = 'describe(\'SCSS Lint | ' + jsStringEscape(relativePath) + '\', function() {\n' + '  it(\'should pass sass-lint\', function() {\n';

  if (passed) {
    output += '    // SCSS Lint passed\n';
  } else {
    output += '    // SCSS Lint failed\n' + '    var error = new chai.AssertionError(\'' + jsStringEscape(messages) + '\');\n' + '    error.stack = undefined;\n' + '    throw error;\n';
  }

  output += '  });\n' + '});\n';

  return output;
}

var qunit = testGenerator(qunitString);
var mocha = testGenerator(mochaString);

module.exports = { quint: quint, mocha: mocha };