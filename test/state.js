'use strict';

module.exports = function(runtime){
  var app = runtime.create('dispatch', {log: false});

  it('can be changed on demand', function(done){
    app.set({onError: done});

    function one(next){
      next.wait.should.be.eql(true);
      next();
    }
    function two(next){
      next.wait = false; next();
    }

    function three(next){
      next.wait.should.be.eql(false);
      done();
    }

    app.tick(one, two, three, {wait: true})();
  });

  it('does not propagate between stacks', function(done){
    app.set({onError: done});

    function foo(next){
      next.wait = false;
    }

    function bar(next){
      next.wait.should.be.eql(true);
      done();
    }

    app.tick(app.tick(foo), bar, {wait: true})();
  });

  it('the default should be parallel', function(done){
    app.set({onError: done});

    var end = [];
    app.set(':handle(\\d+)', function(next){
      var stack = this;
      setTimeout(function(){
        end.push(next.params.handle);
        next(); if(stack.queue){ return ; }

        end.length.should.be.eql(5);
        end.should.not.be.eql([0,1,2,3,4]);

        done();
      }, Math.random()*10+1);
    });

    app.tick('0 1 2 3 4')();
  });

  it('for series indicate wait in options', function(done){
    app.set({onError: done});

    var end = [];
    app.set(':handle(\\d+)', function(next){
      var stack = this;
      setTimeout(function(){
        end.push(next.params.handle);
        next(); if(stack.queue){ return ; }

        end.should.have.property('length', 6);
        end.should.be.eql([0,1,2,3,4,5]);

        done();
      }, Math.random()*10);
    });

    app.tick('0 1 2 3 4 5', {wait: true})();
  });

  it('should handle series & parallel stacks', function(done){
    app.set({onError: done});

    var end = {series:[], parallel:[]};
    app.set(':handle(\\d+)', function seriesParallel(next){
      var stack = this;
      setTimeout(function(){
        if(next.params.handle < 4){
          end.series.push(next.params.handle);
        } else {
          end.parallel.push(next.params.handle);
        }
        next();
        if(stack.queue){ return ; }

        end.series.should.be.eql([0,1,2,3]);
        end.parallel.length.should.be.eql(5);
        end.parallel.should.not.be.eql([4,5,6,7,8]);

        done();

      }, Math.random()*10+1);
    });

    app.tick('4 5 6 7 8', app.tick('0 1 2 3', {wait: true}))();
  });

  it('full series stack should have them all wait', function(done){
    app.set({onError: done});

    var end = [];
    app.set(':handle(\\d+)', function sequence(next){
      var stack = this;
      setTimeout(function(){
        end.push(next.params.handle); next();
        if(stack.host.queue){ return ; }
        end.should.be.eql([0,1,2,3,4,5]);
        done();
      }, Math.random()*10+1);
    });

    app.tick(
      app.tick('0 1 2', {wait: true}),
      app.tick('3 4 5', {wait: true}),
      {wait: true}
    )();

  });

  it('full series stack can be nested, but all should wait', function(done){
    app.set({onError: done});

    var end = [];
    app.set(':handle(\\d+)', function sequence(next){
      var stack = this;
      setTimeout(function(){
        end.push(next.params.handle); next();
        if(stack.host.queue){ return ; }
        end.should.be.eql([0,1,2,3,4,5]);
        done();
      }, Math.random()*10+1);
    });

    app.tick(
      app.tick('0 1', {wait: true}),
      app.tick('2 3', app.tick('4 5', {wait: true}), {wait: true}),
      {wait: true}
    )();

  });
};
