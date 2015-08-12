var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
plugins.minifyCSS = require('gulp-minify-css'); // does not autoload
plugins.gulpif = require('gulp-if'); // does not autoload
plugins.mainBowerFiles = require('main-bower-files');
plugins.filter = require('gulp-filter');
plugins.uglify = require('gulp-uglify');
plugins.symlink = require('gulp-symlink');
var lazypipe = require('lazypipe');
var fs = require('fs');

function getThemeName () {
    if (!fs.existsSync ('./src/package.json')) {
        return "devTheme";
    }
    var name = require('./src/package.json').name;
    if (name == null || name == "") {
        return "devTheme";
    }
    return name;
}

var themeName = getThemeName();
var themesDir = './content/themes/';
var themePath = themesDir + themeName;

var onError = function (err) {
	plugins.util.log(plugins.util.colors.red("Error"), err.message);
        this.emit('end');
};

function endsWith(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

//
// compile scss files and emit normal version + source map and a
// minified version
//
gulp.task('sass', function () {
	gulp.src('./src/css/main.scss')
		.pipe(plugins.plumber(onError))
		.pipe(plugins.sourcemaps.init())
		.pipe(plugins.sass())
		.pipe(plugins.autoprefixer('last 2 version', 'safari 5', 'ie 9', 'opera 12.1'))
		.pipe(plugins.sourcemaps.write('.'))
		.pipe(gulp.dest(themePath + '/assets/css'))
});

gulp.task('sass_minify', function () {
	gulp.src('./src/css/main.scss')
		.pipe(plugins.sass())
		.pipe(plugins.autoprefixer('last 2 version', 'safari 5', 'ie 9', 'opera 12.1'))
		.pipe(plugins.minifyCSS())
		.pipe(gulp.dest(themePath + '/assets/css'))
});

//
// concat all javascript files to site.js
//
gulp.task('js', function () {
	gulp.src(plugins.mainBowerFiles().concat('./src/js/*.js'))
		.pipe(plugins.filter('*.js'))
        .pipe(plugins.plumber(onError))
		.pipe(plugins.sourcemaps.init())
		.pipe(plugins.concat('site.js'))
		.pipe(plugins.sourcemaps.write('.'))
		.pipe(gulp.dest(themePath + '/assets/js'))
});

gulp.task('js_minify', function () {
	gulp.src(plugins.mainBowerFiles().concat('./src/js/*.js'))
		.pipe(plugins.filter('*.js'))
        .pipe(plugins.uglify())
		.pipe(plugins.concat('site.js'))
		.pipe(gulp.dest(themePath + '/assets/js'))
});


//
// copy handlebars theme files over
//
gulp.task('templates_livereload', function() {
	var embed_live_reload = lazypipe()
		.pipe(plugins.rename, function (path) {
				path.extname = ".html";
			}
		)
		.pipe(plugins.embedlr)
		.pipe(plugins.rename, function (path) {
				path.extname = ".hbs";
			}
		);

	gulp.src('./src/templates/**/*.hbs')
		.pipe(plugins.plumber(onError))
		.pipe(plugins.gulpif(function (file) {
				return endsWith(file.path, "default.hbs");
			}, embed_live_reload()
		))
		.pipe(gulp.dest(themePath))
});

gulp.task('templates', function() {
	gulp.src('./src/templates/**/*.hbs')
		.pipe(gulp.dest(themePath))
});

//
// copy images over
//
gulp.task('images', function() {
	gulp.src('./src/images/*')
		.pipe(gulp.dest(themePath + '/assets/images'))
});

//
// copy root files over
//
gulp.task('root-files', function() {
	gulp.src(['./src/*.*', './src/LICENSE'])
		.pipe(gulp.dest(themePath))
});

//
// copy font files over
//
gulp.task('fonts', function() {
	gulp.src('./src/fonts/*.{eot,svg,ttf,woff,otf}')
		.pipe(gulp.dest(themePath + '/assets/fonts'));
});

gulp.task ('symlinkTask', function() {
    if (!fs.existsSync (themesDir)) {
        fs.mkdir (themesDir);
    }
    if (!fs.existsSync (themePath)) {
        fs.mkdir (themePath);
    }
    return gulp.src(themePath)
        .pipe(plugins.symlink.absolute('./content/themes/casper',{force:true}));
});

//
// just run a live reload server and watch files for changes
//
gulp.task('livereload',
          ['sass', 'js', 'templates_livereload', 'fonts', 'root-files', 'images', 'symlinkTask'],
          function() {
	reloader = plugins.livereload("0.0.0.0:35729");

	gulp.watch('./src/css/**/*.scss', ['sass']);
	gulp.watch('./src/templates/**/*.hbs', ['templates_livereload']);
	gulp.watch('./src/fonts/*.{eot,svg,ttf,woff,otf}', ['fonts']);
	gulp.watch('./src/*', ['root-files']);
	gulp.watch('./src/js/*.js', ['js']);
	gulp.watch('./src/images/*', ['images']);

	gulp.watch(themePath + '/**/*.css').on('change', function(file) {
		reloader.changed(file.path);
	});
	gulp.watch(themePath + '/**/*.hbs').on('change', function(file) {
		reloader.changed(file.path);
	});
	gulp.watch(themePath + '/assets/**/*').on('change', function(file) {
		reloader.changed(file.path);
	});

	var ghost = require('ghost');
	process.env.NODE_ENV = 'development';
	ghost({ config: __dirname + '/ghost-config.js' }).then(function (ghostServer) {
		ghostServer.start();
	});
});

gulp.task('dist', ['default'], function() {
	gulp.src(themePath + '/**/*')
		.pipe(plugins.gulpif(function (file) {
				return !endsWith(file.path, ".map");
			}, plugins.zip('./build/' + themeName + '.zip')
		))
		.pipe(gulp.dest('.'));
});

//
// default task, compile everything
//
gulp.task('default', ['sass_minify', 'js_minify', 'templates', 'fonts', 'root-files', 'images']);