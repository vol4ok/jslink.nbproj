define([ "jquery", "underscore", "sm/module", "sm/module" ], function() {
  __ns("main", function(exports) {
    var ClassA, Module1, data, f, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
      for (var key in parent) {
        if (__hasProp.call(parent, key)) child[key] = parent[key];
      }
      function ctor() {
        this.constructor = child;
      }
      ctor.prototype = parent.prototype;
      child.prototype = new ctor;
      child.__super__ = parent.prototype;
      return child;
    };
    data = '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>sl2-amd</title>\n  <script src="sm/main.js"></script>\n</head>\n<body>\n  <h1>AUTHOR </h1>\n  <h1>VERSION </h1>\n</body>\n</html>\n';
    Module1 = sm.module;
    f = function() {
      return console.log("ololo");
    };
    ClassA = function() {
      ClassA.prototype.A = {
        test: 123,
        test2: "24234",
        test3: [ 1, 2, 3 ]
      };
      function ClassA() {
        this.temp = sm.module;
      }
      ClassA.prototype.method1 = function() {
        return this.Tmpl = function(c, p, i) {
          i = i || "";
          var b = i + "";
          var _ = this;
          b += "<!DOCTYPE html>";
          b += "\n" + i;
          b += "<html>";
          b += "\n" + i;
          b += "<head>";
          b += "\n" + i;
          b += '  <meta charset="utf-8">';
          b += "\n" + i;
          b += "  <title>sl2-amd</title>";
          b += "\n" + i;
          b += '  <script src="sm/main.js"></script>';
          b += "\n" + i;
          b += "</head>";
          b += "\n" + i;
          b += "<body>";
          b += "\n" + i;
          b += "  <h1>AUTHOR ";
          b += _.v(_.f("NAME", c, p, 0));
          b += "</h1>";
          b += "\n" + i;
          b += "  <h1>VERSION ";
          b += _.v(_.f("VERSION", c, p, 0));
          b += "</h1>";
          b += "\n" + i;
          b += "</body>";
          b += "\n" + i;
          b += "</html>";
          b += "\n";
          return b;
        };
      };
      return ClassA;
    }();
    __extends(exports, {
      ClassA: ClassA
    });
  });
});