/* global require, module */

const env = require('broccoli-env').getEnv();

const mergeTrees = require('broccoli-merge-trees');

const pathConfig = {
  lib: './src',
  shims: './shims',
  tests: './tests',
  examples: './examples'
};

const trees = [];

trees.push(require('./build-lib/lib')(pathConfig, env));

if (env !== 'production') {
  trees.push(require('./build-lib/testing')(pathConfig, env));
}

if (process.env.EXAMPLES) {
  trees.push(require('./build-lib/examples')(pathConfig, env));
}

module.exports = mergeTrees(trees, { annotation: true });

/*
const Watcher = require('broccoli/lib/watcher');
const broccoli = require('broccoli');

const builder = new broccoli.Builder(fullTree);
const watcher = new Watcher(builder);

watcher.on('change', () => {
  setTimeout(() => {
    console.log('\nCrazy Town\n');
  }, 0);
});
*/
