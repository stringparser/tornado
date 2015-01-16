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
  get.cache[name] = get.cache[name] || new Runtime(name, opts);
  return get.cache[name];
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

  // default handler
  this.set(function rootNode(){
    throw new Error('no function to dispatch from\n' +
      'try this `runtime.set([Function])`\n');
  });

  // default reporter (for errors and logging)
  this.set('#report :path', function reportNode(err, next){
    if(err){ throw err; }
    var status = next.time ? 'done' : 'start';
    var time = next.time ? ('in ' + next.time) : '';
    console.log('[%s] >%s<', status, next.found, time);
    console.log(' >pending: [%s]', !next.done());
    if(next.done()){ console.log(next); }
  });

  // make repl
  if(opts.input || opts.output){ this.repl(opts); }
}
util.inherits(Runtime, Manifold);

// ## Runtime.next(/* arguments */)
// > dispatch next command
//
// arguments
//
// return
//

function Stack(){ }

Runtime.prototype.stack = function(stack){

  if(!(stack instanceof Stack)){
    stack = new Stack();
    util.merge(stack, {
      argv: util.boilArgs(arguments), length: 0
    });

    stack.handle = this.get().handle;
  }

  var type, stem = stack.argv[stack.length];
  if(!(/string|function/).test((type = typeof stem))){
    throw new TypeError('argument should be `string` or `function`');
  }

  function next(){}
  stack[stack.length] = next;

  if(type.length > 6){ // 'function'.length > 'string'.length
    this.get(stem.path || stem.name || stem.displayName, next);
    next.handle = stem; next.depth = next.depth || 1;
    stack.length++;
  } else {
    this.get(stem, next);
    if(!next.handle){ next.handle = stack.handle; }
  }

  next.argv = stack.argv;

  if(next.depth && stack.argv[stack.length]){
    return this.stack(stack);
  } else { return stack; }
};

// ## Runtime.next(/* arguments */)
// > dispatch next command
//
// arguments
//
// return
//

Runtime.prototype.next = function(/* arguments */){

  var self = this, ctx = { };
  var args, pending;

  util.merge(tick, {
    argv: pending.split(/[ ]+/),
    index: 0,
    wait: false,
    done: function done(name){
      if(!name){ return !Boolean(pending); }
      return !pending.match(name);
    }
  });

  ctx = self;
  function tick(args_){
    /* jshint validthis:true */
    function next(err){
      if(next.time && typeof next.time !== 'string'){
        next.time = util.prettyTime(process.hrtime(next.time));
        pending = pending.replace(next.found, '')
          .replace(/[ ]{2,}/g, ' ').trim();
      }

      if(arguments.length > 1){
        args = util.args(arguments, 1).concat(next);
      }

      ctx = this || ctx;
      tick.wait = next.wait; // so wait propagates
      reporter.call(ctx, err, next);
      next.time = next.time || process.hrtime();
      if(!next.depth || !tick.argv[tick.index]){ return ; }
      tick();
      return next.result;
    }
    util.merge(next, tick);

    var cmd = next.argv.slice(tick.index);
    next.handle = self.get(cmd, next).handle;
    if(!next.handle){ next.handle = main.handle; }
    next.index = tick.index += (next.depth || 1);
    args[args.length-1] = next;

    util.asyncDone(function(){
      next.time = process.hrtime();
      next.result = next.handle.apply(ctx, args);
      tick.index = next.index;
      if(next.wait){ return next.result; }
      next.time = null; next();
      return next.result;
    }, function(err){
      if(err){ return next(err); }
      next();
    });
  }

  return tick;
};

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
