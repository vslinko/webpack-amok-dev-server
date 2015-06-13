# webpack-amok-dev-server

[Amok](http://amokjs.com/) for your webpack.

## Pros

- Amok replacing function definitions instead of webpack modules.
This means that all references to changed functions in your application
will use functions with updated definitions just after they're be replaced.
This is very helpful when you're calibrating your function behaviour.

- WebpackAmokDevServer stores compiled code in memory just like WebpackDevServer.
This reduces delay between code change and code replacement.

## Cons

- Amok just replacing your function definitions.
So if you want to rerender your compoment or whole app
you should subscribe to patch event and implement that behaviour manually.

- At current moment WebpackAmokDevServer is slower than WebpackDevServer
with React Hot Loader on large builds because WebpackAmokDevServer is trying
to reload whole build.

- Amok supports only Google Chrome and Chromium.

## Usage

```js
// webpack.config.js

module.exports = {
  // Your webpack configuration...

  amokDevServer: {
    // Same as output.path
    // WebpackAmokDevServer uses this configuration to match file path and url.
    cwd: path.join(__dirname, '.app', 'public'),

    // Same as output.publicPath
    // WebpackAmokDevServer uses this configuration to match file path and url.
    publicPath: '/',

    // Same as output.filename
    // WebpackAmokDevServer uses this configuration to match file path and url.
    filename: 'frontend.js',

    // WebpackAmokDevServer could proxy any request that not matched as webpack build
    // to any other external backend.
    proxy: {
      '*': 'http://localhost:3000',
    },
  },
}
```

```js
// server.js

var webpack = require('webpack')
var WebpackAmokDevServer = require('webpack-amok-dev-server')

var webpackConfig = require('./webpack.config.js')

var server = new WebpackAmokDevServer(
  webpack(webpackConfig),
  webpackConfig.amokWebServer
)

server.listen(8080, '0.0.0.0', function(error) {
  if (error) {
    console.error(error)
  } else {
    console.log('WebpackAmokDevServer started')
  }
})
```

```
node server.js # WebpackAmokDevServer will open Google Chrome on http://localhost:8080
```
