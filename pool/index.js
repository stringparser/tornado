
var util = require('../lib/utils');

var runtime = require('../lib/runtime').Runtime('gulp');


runtime.set('hello', function hello(argv, args, next){

  console.log('---------------------')
  console.log('\n Hello! \n');
  console.log('---------------------')

}).set('world', function world(){
  console.log('---------------------')
  console.log('\n Hello! \n consumed : ', 'world');
  console.log('---------------------')
}).handle(function overrridenWorld(){
  console.log('---------------------')
  console.log('\n Hello! \n consumed : ', 'overrridenWorld');
  console.log('---------------------')
})

runtime.set('something', function something(argv, args, next){
  console.log('---------------------')
  console.log('\n Something! \n');
  console.log('---------------------')
}).set('else', function Else(){

  console.log('---------------------')
  console.log('\n Something! \n consumed : ', 'else');
  console.log('---------------------')
})

runtime.handle(function rootHandle(){
  console.log('root handlerrr')
}).completion(['one', 'two', 'three']).completion(function(){
  return [1,2,3]
})