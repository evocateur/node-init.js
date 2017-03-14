/* @flow */
'use strict'

const path = require('path')

const execa = require('execa')
const updateJsonFile = require('update-json-file')

const { getPkg, isReactProject } = require('../pkg.js')
const {
  JSON_OPTIONS, PACKAGE_JSON, PACKAGE_JSON_DEVDEPS
} = require('../values.js')

const LABEL = 'ESLint installed and configured'

const DROP_DEV_DEPS = [
  // use prettier instead of ESLint for "standard" code style
  'eslint-config-semistandard',
  'eslint-config-standard',
  'eslint-config-standard-react',
  'eslint-plugin-standard'
]

const ESLINT_PACKAGES = [
  'eslint',
  'eslint-plugin-node',
  'eslint-plugin-promise'
]

const ESLINT_REACT_PACKAGES = [
  'eslint-plugin-react'
]

function npmUninstall (cwd) {
  return execa('npm', [
    'uninstall', '--save-dev',
    ...DROP_DEV_DEPS
  ], { cwd })
}

function npmInstall (cwd) {
  return getPkg(cwd)
    .then((pkg) => {
      let packages = [].concat(ESLINT_PACKAGES)
      if (isReactProject(pkg)) {
        packages = packages.concat(ESLINT_REACT_PACKAGES)
      }
      return execa('npm', [
        'install', '--save-dev',
        ...packages
      ], { cwd })
    })
}

function npmScript (cwd) {
  return updateJsonFile(path.join(cwd, 'package.json'), (pkg) => {
    pkg.scripts = pkg.scripts || {}
    pkg.scripts.eslint = 'eslint --fix --cache .'
    return pkg
  }, JSON_OPTIONS)
}

/* :: import type { TaskOptions } from '../types.js' */

function fn ({ cwd } /* : TaskOptions */) {
  return npmUninstall(cwd)
    .then(() => npmInstall(cwd))
    .then(() => npmScript(cwd))
}

module.exports = {
  fn,
  id: path.basename(__filename),
  label: LABEL,
  provides: [ PACKAGE_JSON_DEVDEPS ],
  requires: [ PACKAGE_JSON ]
}
