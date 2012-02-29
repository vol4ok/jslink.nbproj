var ClassA, Module1, data, f,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

module('ui.module');

include('underscore');

include('jquery');

include('style.styl');

data = __template('test/index.html');

Module1 = require("sm/" + "module");

if (__DEBUG__) console.log(__AUTHOR__, __VERSION__);

f = function() {
  return console.log("ololo");
};

ClassA = (function() {

  ClassA.prototype.A = __precompile(function() {
    return {
      test: 123,
      test2: "24234",
      test3: [1, 2, 3]
    };
  });

  function ClassA() {
    this.temp = require("sm/module");
  }

  ClassA.prototype.method1 = function() {
    return this.Tmpl = __template("test/index.mu");
  };

  return ClassA;

})();

__extends(exports, {
  ClassA: ClassA
});
