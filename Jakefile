var fs = require('fs'),
    path = require('path'),
    interleave = require('interleave');

task('default', function() {
    interleave('src', {
        data: JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')),
        path: '.',
        after: ['uglify']
    });
});