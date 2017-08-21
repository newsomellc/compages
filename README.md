# Compages
*(this project is kind of a mess right now-- had to get it out early for internal reasons. Don't use it yet!)*

### *Noun*
* **compāges** *f (genitive compāgis); third declension*
1. the act of binding, fastening
2. a bond, tie
3. a joint
4. a structure
5. (figuratively) feature

Also, Compages is the no-compromise content management system that isn't a CMS.

The goal of Compages is to bring back the intuitive, file-structure-based web authoring experience of the late 1990s without losing any modern features.

It works like this: set up a site project, put whatever user-facing content you want in it (and using whatever HTML/JS/CSS languages you want).

This intuitive method always had the drawback that you lost the use of modern features-- templating, minification, alternate compile-to-html/css/js languages, database-backed-pages etcetcetc.  But not anymore: Compages automatically converts Pug/Mustache/etc to HTML, LESS/Sass to CSS, compiles Javascript, and resizes and crops images.

While there may have been reasons in past years to organize projects by a strict hierarchy- CSS one place, HTML templates in another, static resources in yet another- it's no longer necessary. Our programs are smart enough know what goes where from what kind of file it is- so why not organize your content for your benefit, rather than that of the computer?

The intent is to allow the web author to jump as quickly as possible, with as few mental hurdles as possible, into building whatever they want.

Static sites are all the rage right now. Compages will glady operate as a static-site generator (using the venerable Gulp build system), and for most current uses that's absolutely sufficient.  But it doesn't limit you: Compages-based sites can be served directly using Express, generating pages as needed.  Or you can use Compages as a fallback, serving resources that don't change from a cache or CDN, only invoking the app for dynamic content.

# Installation
* How to make a basic page

# Config
* How to choose your template/CSS/JS engine
* How to configure static file types (i.e. ones that get served without modification)
* How to configure image variants (todo: get rid of MediaFile, spin to separate app)

# CLI
* Write a simple CLI project generator

# API
* Middleware
* * DB-backed pages (like a classic blog)
* limitations (i.e. entire page list must be known at build time unless you want to make it more complicated)
* If you want to make it more complicated
	* live-generated fallbacks
	* dynamic "app-style" pages

# Gulp
* Building
* Staging to CDN
