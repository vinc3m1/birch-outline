/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const gulp = require('gulp');
const gutil = require('gulp-util');
const clean = require('gulp-clean');
const mocha = require('gulp-mocha');
const cache = require('gulp-cached');
const coffee = require('gulp-coffee');
const webpack = require('webpack-stream');
const coffeelint = require('gulp-coffeelint');
const {
  Renderer
} = require('birch-doc');
const webpackConfig = require('./webpack.config');

gulp.task('clean', function() {
  cache.caches = {};
  return gulp.src(['.coffee/', 'lib/', 'doc/api/', 'min/']).pipe(clean());
});

gulp.task('test', () => gulp.src(['test/**/*-spec.coffee'], {read: false})
  .pipe(mocha({reporter: 'nyan'})));

gulp.task('javascript', () => gulp.src('src/**/*.js')
  .pipe(cache('javascript'))
  .pipe(gulp.dest('lib/')));

gulp.task('coffeescript', () => gulp.src('./src/**/*.coffee')
  .pipe(cache('coffeescript'))
  .pipe(coffeelint())
  .pipe(coffeelint.reporter())
  .pipe(coffee({bare: true}).on('error', gutil.log))
  .pipe(gulp.dest('lib/')));

gulp.task('doc', () => Renderer.renderModules(['.'], 'doc/api/', {layout: 'class'}));

gulp.task('webpack', ['javascript', 'coffeescript'], function() {
  const config = Object.create(webpackConfig);
  config.output.path = null;
  return gulp.src('lib/index.js')
    .pipe(webpack(config))
    .pipe(gulp.dest('min/'));
});

gulp.task('webpack:watch', ['javascript', 'coffeescript'], function() {
  const config = Object.create(webpackConfig);
  config.watch = true;
  config.output.path = null;
  config.plugins = []; // remove uglify
  return gulp.src('lib/index.js')
    .pipe(webpack(config))
    .pipe(gulp.dest('min/'));
});

gulp.task('prepublish', ['clean', 'test', 'doc'], () => gulp.start('webpack'));

gulp.task('watch', ['clean', 'test', 'doc'], function() {
  gulp.watch('src/**/*', ['javascript', 'coffeescript', 'test', 'doc']);
  gulp.watch('test/**/*', ['test']);
  return gulp.start('webpack:watch');
});

gulp.task('default', ['watch'], function() {});
