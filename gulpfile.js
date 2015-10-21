var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babel = require('babelify');
var connect = require('gulp-connect');
var glob = require('glob');
var jasmine = require('gulp-jasmine');
var specFiles = './spec/*.js';

function runTests() {
  return gulp.src('./build/specs.js').pipe(jasmine());
}

function compileTests() {
  var filenames = glob.sync(specFiles);
  return browserify({
    entries: filenames,
    debug: true
  })
  .on('error', function (err) {
    console.error(err);
    this.emit('end');
   })
  .transform(babel)
  .bundle()
  .pipe(source('specs.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./build'));
}

function compile(watch, sources, target, tests) {
  var bundler = watchify(browserify({
    entries: sources,
    debug: true
  }).transform(babel));

  function rebundle() {
    bundler.bundle()
      .on('error', function(err) { console.error(err); this.emit('end'); })
      .pipe(source(target))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./build'));
  }

  if (watch) {
    bundler.on('update', function() {
      console.log('-> bundling...');
      rebundle();
      if (tests) {
        runTests();
      }
    });
  }

  rebundle();
}

function watch() {
  return compile(true, './src/index.js', 'build.js');
}

function testWatch() {
  return compile(true, glob.sync(specFiles), 'specs.js', true);
}

gulp.task('build', function() { return compile(); });
gulp.task('watch', function() { return watch(); });
gulp.task('webserver', function() {
  connect.server({
    livereload: true
  });
});
gulp.task('test-watch', function () { return testWatch(); });
gulp.task('default', ['webserver', 'watch']);
