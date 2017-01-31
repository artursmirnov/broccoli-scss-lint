# broccoli-scss-linter

> Broccoli plugin for [`sass-lint`](https://github.com/sasstools/sass-lint).

### Dependencies

1. [Nodejs](https://nodejs.org/en/)

### Installation
```shell
npm install broccoli-scss-linter --save
```

### Options

#### config
Type: `String`
Default: `''`

Specify a configuration file to use

### Example
```js
var ScssLinter = require('broccoli-scss-linter');

var broccoliTree = new ScssLinter([inputNode], {
  config: '.scss-lint.yml'
});
```
