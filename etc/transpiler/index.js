
const babel = require('@babel/standalone');

// yearly presets now deprecated, moving to preset-env - https://babeljs.io/docs/en/babel-preset-es2015/
//const babelPresetEnv = require('@babel/preset-env');
//const babelPresetFlow = require('@babel/preset-flow');

//babel.registerPreset('env', babelPresetEnv);
//babel.registerPreset('flow', babelPresetFlow);

function processData(input) {
  const parsedInput = JSON.parse(input);
  const output = {
    results: [],
    errors: [],
  };
  const opts = {
    presets: [
      ['env', 
      {
        useBuiltIns: "usage",
        corejs: 3.8,
        loose: true,
        forceAllTransforms: true,
      }],
      //'flow'
    ],
    //plugins: ['transform-object-rest-spread', 'transform-regenerator'],
    parserOpts: {
      allowReturnOutsideFunction: true,
    },
    sourceMaps: true,
    //ignore: [
    //  "./node_modules/core-js/**/*.js"
    //]
  };
  for (let i = 0; i < parsedInput.length; i++) {
    const code = parsedInput[i];
    try {
      const result = babel.transform(code, opts);
      if (output.errors.length > 0) {
        continue;
      }
      output.results.push({ code: result.code, map: result.map });
    } catch (e) {
      const error = {
        index: i,
        // error message includes the snippet of code, which we don't want in the message
        //message: (e.message || '').split('\n')[0],
        message: e.message || '',
        //code: 'testCode'
      };
      if (e.loc) {
        error.line = e.loc.line;
        error.column = e.loc.column;
      }
      /*
        this was introduced trying to transpile this file:
        https://github.com/protobufjs/protobuf.js/blob/master/cli/wrappers/es6.js
        the file contains unrecoverable errors for the parser:
              import * as $protobuf from $DEPENDENCY;

              $OUTPUT;

              export { $root as default };
        this error was added as a warning to still have visibility without causing termination
      */
      if (e.message.includes('$')) {
        output.warnings.push(error);
        continue;
      }

      //console.log("Error: ", error);
      output.errors.push(error);
    }
  }

  if (output.errors.length == 0) {
    delete output.errors;
  } else {
    delete output.results;
  }

  const outData = JSON.stringify(output, null, 2);
  const cb = () => process.exit(0);

  // For large inputs the entire stdout buffer might not be written after the first call to write(),
  // so explicitly wait for it to drain before exiting the process.
  // See https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback
  if (!process.stdout.write(outData, cb)) {
    process.stdout.once('drain', cb);
  } else {
    process.nextTick(cb);
  }
}

(function handleStream() {
  let data = '';
  process.stdin.on('readable', () => {
    while (true) {
      const chunk = process.stdin.read();
      if (!chunk) {
        break;
      }
      data += chunk;
    }
  });

  process.stdin.on('end', () => {
    processData(data);
  });

  process.stdin.on('error', () => {
    process.exit(2);
  });
})();
