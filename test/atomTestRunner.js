/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const path = require('path');
const Mocha = require('mocha');

const {allowUnsafeEval, allowUnsafeNewFunction} = require('loophole');

module.exports = args => // Fixes CSP eval restriction
allowUnsafeEval(function() {

  const mocha = new Mocha({
    ui: 'bdd',
    reporter: 'html'
  });

  const applicationDelegate = args.buildDefaultApplicationDelegate();

  // Create element for mocha reporter
  const element = document.createElement('div');
  element.id = 'mocha';
  document.body.appendChild(element);
  document.body.style.overflow = 'scroll';

  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', path.join(__dirname, '..', 'node_modules/mocha/mocha.css'));
  document.head.appendChild(link);

  // Build atom global
  window.atom = args.buildAtomEnvironment({
    applicationDelegate, window, document,
    configDirPath: process.env.ATOM_HOME,
    enablePersistence: false
  });

  for (let each of Array.from(args.testPaths)) {
    Mocha.utils.lookupFiles(each, ['js', 'coffee'], true).forEach(mocha.addFile.bind(mocha));
  }

  // Run tests and return a promise
  return new Promise((resolve, reject) => mocha.run(failures => resolve(failures)));
});
