/* @flow */
'use strict';

const os = require('os');
const path = require('path');

const through2 = require('through2');
const vfs = require('vinyl-fs');

const fs = require('../fs.js');
const { getGitHubPath, getOriginUrl } = require('../git.js');
const { GIT_REPO, PACKAGE_JSON } = require('../values.js');

const LABEL = 'Travis CI badge in README.md';

/* :: import type { TaskOptions } from '../types.js' */

function fn({ cwd } /* : TaskOptions */) {
  return Promise.all([
    getOriginUrl(cwd).then(getGitHubPath),
    fs.touch(path.join(cwd, 'README.md'))
  ]).then(
    ([githubPath]) =>
      new Promise((resolve, reject) => {
        if (!githubPath) {
          resolve();
          return; // Travis CI is only for GitHub projects
        }
        vfs
          .src('README.md', { cwd })
          .pipe(
            through2.obj((file, enc, cb) => {
              const svgUrl = `https://travis-ci.org/${githubPath}.svg?branch=master`;
              const mdBadge = `[![Travis CI Status](${svgUrl})](https://travis-ci.org/${githubPath})`;
              let contents = file.contents.toString(enc);
              if (!contents.includes(svgUrl)) {
                const lines = contents.split(os.EOL);
                lines[0] += ` ${mdBadge}`;
                contents = lines.join(os.EOL);
              }
              file.contents = Buffer.from(contents, enc);
              cb(null, file);
            })
          )
          .pipe(vfs.dest(cwd))
          .on('error', err => reject(err))
          .on('end', () => resolve());
      })
  );
}

module.exports = {
  fn,
  id: path.basename(__filename),
  label: LABEL,
  requires: [GIT_REPO, PACKAGE_JSON]
};
