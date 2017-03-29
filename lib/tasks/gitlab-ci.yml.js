/* @flow */
'use strict';

const path = require('path');

const { safeDump, safeLoad } = require('js-yaml');
const readPkgUp = require('read-pkg-up');
const union = require('lodash.union');

const { ensureArrayTail } = require('../data.js');
const fs = require('../fs.js');
const { getBitbucketPath, getGitHubPath, getOriginUrl } = require('../git.js');
const { fetchSupportedMajors } = require('../nodejs-versions.js');
const { GIT_REPO, PACKAGE_JSON } = require('../values.js');

const LABEL = '.gitlab-ci.yml initialised';

/* :: import type { TaskOptions } from '../types.js' */

function fn({ cwd } /* : TaskOptions */) {
  const filePath = path.join(cwd, '.gitlab-ci.yml');
  return Promise.all([
    getOriginUrl(cwd),
    readPkgUp({ cwd }).then(({ pkg }) =>
      fetchSupportedMajors((pkg.engines || {}).node))
  ]).then(([originUrl, majors]) => {
    if (getBitbucketPath(originUrl) || getGitHubPath(originUrl)) {
      return; // skip if either BitBucket or GitHub is in use
    }
    return fs
      .touch(filePath)
      .then(() => fs.readFile(filePath, 'utf8'))
      .then(safeLoad)
      .then(cfg => {
        cfg = cfg || {};

        cfg.before_script = union(cfg.before_script || [], [
          'apt-get update -qq',
          'apt-get install -qy libelf1',
          'npm install --global npm',
          'npm install --global yarn'
        ]);

        cfg.before_script = ensureArrayTail(
          cfg.before_script || [],
          'npm install'
        );

        cfg.test = cfg.test || {};

        // test against the oldest supported major version of Node.js
        cfg.test.image = cfg.test.image || 'node:' + majors[0];

        cfg.test.script = union(cfg.test.script || [], ['npm test']);

        return safeDump(cfg);
      })
      .then(data => fs.writeFile(filePath, data));
  });
}

module.exports = {
  fn,
  id: path.basename(__filename),
  label: LABEL,
  requires: [GIT_REPO, PACKAGE_JSON]
};
