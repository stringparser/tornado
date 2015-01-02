'use strict';

var util = require('./lib/util');
var Manifold = require('manifold');

//
// ## module.exports
//
// - get: obtain a Runtime instance from cache
// - create: instantiate a Runtime instance and cache it
//
// returns this.next(ctx, args, next)
//

exports = module.exports = {
  get: get,
  create: create,
  Runtime: Runtime
};

function get(name){
  return get.cache[name];
}
get.cache = { };

function create(name, opts){
  name = util.type(name).string || '#root';
  return (get.cache[name] = new Runtime(name, opts));
}

// ## Runtime([name, opts])
// > constructor
//
// arguments
//  - name: type `string`, name for the runtime
//  - opts

// return
//

function Runtime(name, opts){

  if( !(this instanceof Runtime) ){
    return new Runtime(name, opts);
  }

  // currywurst
  //
  opts = util.type(opts || name).plainObject || { };
  opts.name = opts.name || name;

  Manifold.call(this, opts);

  function app(stems, opt){
    if(opt || typeof stems !== 'string'){
      return app.set(stems, opt);
    }
    return app.get(stems, opt);
  }
  util.merge(app, this);

  var doREPL = util.type(opts.input || opts.output).match(/stream/);
  if(doREPL){ app.repl(opts); }

  // default handlers
  //
  app(function rootNode(){
    throw new Error(
      'runtime.get() needs a function to dispatch\n' +
      'try this `runtime.set(function)`\n');
  });

  // default the reporter
  //

  app('#report', function reportNode(err, args, next){
    if(err){ throw err; }
    console.log('[%s] >%s< in', next.done ? 'done' : 'wait',
      next.found, next.time);
  });

  return app;
}
util.inherits(Runtime, Manifold);

// ## Runtime.repl([opt])
// > REPL powered by the readline module
//
// arguments
//
// return
//

Runtime.prototype.repl = function(o){

  if(this.input){ return this; }

  // this was the very beginning of it all :D
  var readline = require('readline');

  util.merge(this, readline.createInterface({
    input: util.type(o.input).match(/stream/) || util.through.obj(),
    output: util.type(o.output).match(/stream/) || util.through.obj(),
    terminal: o.terminal,
    completer: util.type(o.completer).function || util.completer,
  }));

  this.on('line', this.next);
  if(!this.terminal){ return this; }

  // the default prompt
  this.setPrompt(' '+this.store.name+' > ');

  var self = this;
  // modify the default keypress for SIGINT
  this.input.removeAllListeners('keypress');
  this.input.on('keypress', function (s, key){
    if( key && key.ctrl && key.name === 'c'){
      process.stdout.write('\n');
      process.exit(0);
    } else { self._ttyWrite(s, key); }
  });

  // make some methods chain
  var prompt = this.prompt;
  this.prompt = function(/* arguments */){
    prompt.apply(this, arguments);
    return this;
  };

  var setPrompt = this.setPrompt;
  this.setPrompt = function(/* arguments */){
    setPrompt.apply(this, arguments);
    return this;
  };

  return this;
};

// ## Runtime.next(/* arguments */)
// > dispatch next command
//
// arguments
//
// return
//

Runtime.prototype.next = function(/* arguments */){

  var self = this;
  var ctx = this.get(arguments[0]);
  var args = util.args(arguments, 1);
  var reporter = this.get('#report ' + ctx.path).handle;

  ctx.handle = ctx.handle || this.get().handle;

  function loop(){
    /* jshint validthis:true */
    function next(err){

      var mark = process.hrtime();
      if(typeof next.time === 'string'){ }
      else if(next.wait || next.done){
        next.time = util.prettyTime(process.hrtime(next.time));
      } else { next.time = mark; }

      ctx = this || ctx;
      if(err){
        args = util.args(arguments);
        reporter.apply(ctx, args.concat(next));
        if(next.done){ return next; }
        args.shift();
      }

      util.nextTick(function(){
        loop.wait = next.wait; // wait can propagate
        next.done = !next.depth || !loop.argv[loop.index];
        reporter.call(ctx, null, args, next);
        if(next.done){ return next; }
        loop.apply(ctx, args);
      });

      return next;
    }
    util.merge(next, loop);

    var handle = self.get(next.argv.slice(loop.index), next).handle;
    if(handle === void 0){ handle = ctx.handle; }
    loop.index += (next.depth || 1);

    try {
      next.time = process.hrtime();
      handle.apply(this, args.concat(next));
    } catch(error){
      reporter.apply(ctx, [error].concat(args, next));
      if(next.done){ return next; }
    }

    if(!next.wait){ return next(); }

    return next;
  }

  util.merge(loop, {
    index: 0,
    argv: this.boil('#context.argv')(arguments[0]),
    depth: 0,
    hrtime: { }
  });

  return loop.apply(ctx);
};
