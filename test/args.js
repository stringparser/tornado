'use strict';

var should = require('should');

module.exports = function(runtime){
  should.exists(runtime);
  var app = runtime.create('args');

  app.log.set(function(){}); // disable logging

  it('should pass arguments around', function(done){
    function one(next, foo, bar, baz){
      next.wait = true;
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      next();
    }

    function two(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      next();
    }

    function three(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      next(); done();
    }

    app.next(one, two, three)(1, 2, 3);
  });

  it('should be able change arguments around', function(done){
    function one(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      next(null, 2, 3, 4);
    }

    function two(next, foo, bar, baz){
      foo.should.be.eql(2);
      bar.should.be.eql(3);
      baz.should.be.eql(4);
      next(null, 5, 6, 7);
    }

    function three(next, foo, bar, baz){
      foo.should.be.eql(5);
      bar.should.be.eql(6);
      baz.should.be.eql(7);
      next(); done();
    }

    app.next(one, two, three)(1, 2, 3);
  });

  it('should not change arguments if length is less than 2', function(done){
    function one(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      next(null);
    }

    function two(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      next(null);
    }

    function three(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      done();
    }

    app.next(one, two, three)(1, 2, 3);
  });

  it('should pass arguments around between stacks', function(done){
    function one(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
    }

    function two(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
    }

    function three(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      done();
    }

    app.next(app.next(one), app.next(two), app.next(three))(1, 2, 3);
  });

  it('should not be able to change arguments between stacks', function(done){

    function one(next, foo, bar, baz){
      foo.should.be.eql(1);
      bar.should.be.eql(2);
      baz.should.be.eql(3);
      next(null, 2, 3, 4);
    }

    function two(next, foo, bar, baz){
      foo.should.be.eql(2);
      bar.should.be.eql(3);
      baz.should.be.eql(4);
      next(null, 3, 4, 5);
    }

    function three(next, foo, bar, baz){
      foo.should.be.eql(3);
      bar.should.be.eql(4);
      baz.should.be.eql(5);
      done();
    }

    app.next(app.next(one), app.next(two, three), {wait: true})(1,2,3);

  });
};