'use strict';

import plugins  from 'gulp-load-plugins';
import yargs    from 'yargs';
import browser  from 'browser-sync';
import gulp     from 'gulp';
import rimraf   from 'rimraf';
import yaml     from 'js-yaml';
import fs       from 'fs';

// Load all Gulp plugins into one variable
const $ = plugins();

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

// Execute drush clear cache on a spawned shell when new files are added on template folder
const exec = require('child_process').execSync;

function drushcr(done) {
    exec('drush cr',done)
}

// Load settings from settings.yml
const { COMPATIBILITY, UNCSS_OPTIONS, PATHS } = loadConfig();

function loadConfig() {
    let ymlFile = fs.readFileSync('config.yml', 'utf8');
    return yaml.load(ymlFile);
}

// Build the "dist" folder by running all of the below tasks
gulp.task('build',
    gulp.series(clean, gulp.parallel(sass, javascript, images)));

// Build the site, run the server, and watch for file changes
gulp.task('default',
    gulp.series('build', server, watch));

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
    rimraf('css', done);
    rimraf('js', done);
    rimraf('images', done);
}

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately
// function copy() {
//     return gulp.src(PATHS.assets)
//         .pipe(gulp.dest(PATHS.dist + '/assets'));
// }

// Copy page templates into finished HTML files
// function pages() {
//     return gulp.src('src/pages/**/*.{html,hbs,handlebars}')
//         .pipe(panini({
//             root: 'src/pages/',
//             layouts: 'src/layouts/',
//             partials: 'src/partials/',
//             data: 'src/data/',
//             helpers: 'src/helpers/'
//         }))
//         .pipe(gulp.dest(PATHS.dist));
// }

// Load updated HTML templates and partials into Panini
// function resetPages(done) {
//     panini.refresh();
//     done();
// }

// Compile Sass into CSS
// In production, the CSS is compressed
function sass() {
    return gulp.src('source/scss/**/*.scss')
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            includePaths: PATHS.sass
        })
            .on('error', $.sass.logError))
        .pipe($.autoprefixer({
            browsers: COMPATIBILITY
        }))
        // Comment in the pipe below to run UnCSS in production
        .pipe($.if(PRODUCTION, $.uncss(UNCSS_OPTIONS)))
        .pipe($.if(PRODUCTION, $.cssnano()))
        .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        .pipe(gulp.dest('css'))
        .pipe(browser.reload({ stream: true }));
}

// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
    return gulp.src(PATHS.javascript)
        .pipe($.sourcemaps.init())
        // .pipe($.babel({ignore: ['what-input.js']}))
        .pipe($.concat('main.js'))
        .pipe($.if(PRODUCTION, $.uglify()
                .on('error', e => { console.log(e); })
))
.pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        .pipe(gulp.dest('js'));
}

// Copy images to the "dist" folder
// In production, the images are compressed
function images() {
    return gulp.src('source/images/**/*')
        .pipe($.if(PRODUCTION, $.imagemin({
            progressive: true
        })))
        .pipe(gulp.dest('images'));
}

// // Start a server with BrowserSync to preview the site in
function server(done) {
    browser.init();
    done();
}

// Reload the browser with BrowserSync
function reload(done) {
    browser.reload();
    done();
}

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
    gulp.watch('templates/**/**')
        .on('add', drushcr)
        .on('unlink', drushcr)
        .on('all', browser.reload);
    gulp.watch('source/scss/**/*.scss').on('all', gulp.series(sass, browser.reload));
    gulp.watch('source/js/**/*.js').on('all', gulp.series(javascript, browser.reload));
    gulp.watch('source/images/**/*').on('all', gulp.series(images, browser.reload));
}
