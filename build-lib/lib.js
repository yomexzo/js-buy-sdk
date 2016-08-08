/* global require, module */

"use strict";

const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const rollup = require('broccoli-rollup');
const rollupCommonJS = require('rollup-plugin-commonjs');
const rollupNodeResolve = require('rollup-plugin-node-resolve');
const babelTranspiler = require('broccoli-babel-transpiler');
const uglifyJavaScript = require('broccoli-uglify-js');
const pkg = require('../package.json');
const polyfills = require('./polyfills');
const loader = require('./loader');
const Licenser = require('./util/licenser');
const Versioner = require('./util/versioner');

// this could be replaced in the future by a .babelrc file
const BABEL_OPTS = {
  presets: [
    'es2015'
  ]
};

function sourceTree(input, output, moduleType) {
  const rollupTree = rollup(
    input,
    {
      inputFiles: ['**/*.js'],
      rollup: {
        entry: 'shopify.js',
        dest: output,
        format: moduleType,
        moduleName: 'Shopify',
        moduleId: pkg.name,
        plugins: [
          rollupNodeResolve({
            jsnext: true,
            main: true,
            browser: true
          }),

          rollupCommonJS({
            include: '*'
          })
        ]
      }
    }
  );

  return babelTranspiler(rollupTree, BABEL_OPTS);
}

module.exports = function (pathConfig, env) {
  const polyfillTree = polyfills();
  const loaderTree = loader();

  const trees = [{
    name: 'amd',
    moduleType: 'amd',
    additionalTrees: [],
    concatOptions: {}
  }, {
    name: 'commonjs',
    moduleType: 'cjs',
    additionalTrees: [],
    concatOptions: {}
  }, {
    name: 'globals',
    moduleType: 'amd',
    additionalTrees: [loaderTree],
    concatOptions: {
      header: ';(function () {',
      headerFiles: ['loader.js'],
      footer: `
        window.ShopifyBuy = require('shopify-buy/shopify').default;
        })();
      `
    }
  }].map(config => {
    const fileOutput = `${pkg.name}.${config.name}.js`;
    const baseTree = sourceTree(pathConfig.lib, fileOutput, config.moduleType);

    const bareTree = concat(mergeTrees([baseTree].concat(config.additionalTrees)), Object.assign({
      inputFiles: ['**/*.js'],
      outputFile: fileOutput
    }, config.concatOptions));

    const polyfilledLibTree = concat(mergeTrees([polyfillTree, bareTree]), {
      headerFiles: ['polyfills.js'],
      inputFiles: ['**/*.js'],
      outputFile: `${pkg.name}.polyfilled.${config.name}.js`
    });

    return mergeTrees([bareTree, polyfilledLibTree]);
  });

  const nodeTree = funnel(babelTranspiler(pathConfig.lib, BABEL_OPTS), {
    srcDir: '.',
    destDir: './node-lib'
  });

  if (env.production) {
    trees.push(uglifyJavaScript(funnel(trees, {
      getDestinationPath: function (path) {
        return path.replace(/\.js/, '.min.js');
      }
    })));
  }

  return mergeTrees([nodeTree, loaderTree, polyfillTree, new Licenser([
    new Versioner(trees, { templateString: '{{versionString}}' })
  ])]);
};
