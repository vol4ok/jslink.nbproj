define(["underscore", "jquery", "style.styl", "sm/module", "sm/module"], function() {
  __ns("ui.module", function(a) {
    var b, c, d, e, f = Object.prototype.hasOwnProperty,
        g = function(a, b) {
        function d() {
          this.constructor = a
        }
        for (var c in b) f.call(b, c) && (a[c] = b[c]);
        return d.prototype = b.prototype, a.prototype = new d, a.__super__ = b.prototype, a
        };
    d = '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>sl2-amd</title>\n  <script src="sm/main.js"></script>\n</head>\n<body>\n  <h1>AUTHOR </h1>\n  <h1>VERSION </h1>\n</body>\n</html>\n', c = sm.module, __DEBUG__ && console.log(__AUTHOR__, __VERSION__), e = function() {
      return console.log("ololo")
    }, b = function() {
      function a() {
        this.temp = sm.module
      }
      return a.prototype.A = {
        test: 123,
        test2: "24234",
        test3: [1, 2, 3]
      }, a.prototype.method1 = function() {
        return this.Tmpl = function(a, b, c) {
          c = c || "";
          var d = c + "",
              e = this;
          return d += "<!DOCTYPE html>", d += "\n" + c, d += "<html>", d += "\n" + c, d += "<head>", d += "\n" + c, d += '  <meta charset="utf-8">', d += "\n" + c, d += "  <title>sl2-amd</title>", d += "\n" + c, d += '  <script src="sm/main.js"></script>', d += "\n" + c, d += "</head>", d += "\n" + c, d += "<body>", d += "\n" + c, d += "  <h1>AUTHOR ", d += e.v(e.f("NAME", a, b, 0)), d += "</h1>", d += "\n" + c, d += "  <h1>VERSION ", d += e.v(e.f("VERSION", a, b, 0)), d += "</h1>", d += "\n" + c, d += "</body>", d += "\n" + c, d += "</html>", d += "\n", d
        }
      }, a
    }(), g(a, {
      ClassA: b
    })
  })
})