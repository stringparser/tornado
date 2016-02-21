'use strict';

var Runtime = require('../.');
var Promise = require('es6-promise').Promise;

var runtime = Runtime.create({
  reduceStack: function(stack, site){
    if(typeof site !== 'function'){ return; }
    stack.push({
      fn: site,
      label: site.stack instanceof Runtime
        ? site.stack.tree().label
        : site.label || site.name || 'anonymous'
    });
  },
  onHandle: function(site, stack){
    if(!site.time){
      console.log('`%s` started', site.label);
      site.time = process.hrtime();
    } else {
      var diff = process.hrtime(site.time);
      console.log('`%s` ended after %s ms',
        site.label, diff[0]*1e+3 + Math.floor(diff[1]*1e-6)
      );
    }
  },
  onHandleError: function(error, site){
    var file = error.stack.match(/\/[^)]+/).pop();
    console.log('`%s` errored at', site.label, file);
    console.log(error.stack);
  }
});

function foo(next, value){
  console.log('received `%s`', value);
  setTimeout(function(){
    if(Math.random() > 0.7){
      next(new Error('bad luck today!'));
    } else {
      next(null, 'Callback');
    }
  }, Math.random()*10);
}

function bar(next, value){
  return new Promise(function(resolve, reject){
    setTimeout(function(){
      if(Math.random() > 0.9){
        reject(new Error('bad luck today!'));
      } else {
        resolve(value + 'Promise');
      }
    }, Math.random()*10);
  });
}

var fs = require('fs');
var through = require('through2');

function baz(next, value){
  var stream = through.obj(
    function write(chunk, enc, cb){
      if(Math.random() > 0.95){
        cb(new Error('bad luck today!'));
      } else {
        cb();
      }
    },
    function end(){
      next(value + 'Stream');
    }
  );

  return fs.createReadStream(__filename).pipe(stream);
}

var composed = runtime.stack(foo, bar, baz, {wait: true});

composed('insert args here', function onStackEnd(err, result){
  if(err){ throw err; }
  console.log('result: `%s`', result);
});

// how does it look like?
console.log('Stack tree -> %s',
  require('archy')(composed.stack.tree())
);