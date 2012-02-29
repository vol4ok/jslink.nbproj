var Filter, JsLinker, ROOT_PATH, SANDBOX_ENV, basename, coffee, dirname, existsSync, extname, fs, hogan, inspect, join, jsp, makeDir, normalize, obj2ast, path, pro, relative, removeExt, setExt, vm, walkSync, _, _ref,
  __slice = Array.prototype.slice;

require('colors');

fs = require('fs');

path = require('path');

vm = require('vm');

_ = require('underscore');

hogan = require('hogan.js');

coffee = require('coffee-script');

jsp = require("uglify-js").parser;

pro = require("uglify-js").uglify;

walkSync = require('fs.walker').walkSync;

Filter = require('path.filter');

_ref = require('fs.utils'), makeDir = _ref.makeDir, setExt = _ref.setExt, removeExt = _ref.removeExt;

join = path.join, dirname = path.dirname, basename = path.basename, extname = path.extname, normalize = path.normalize, relative = path.relative, existsSync = path.existsSync;

inspect = require('util').inspect;

removeExt = function(path) {
  return join(dirname(path), basename(path, extname(path)));
};

ROOT_PATH = join(process.cwd(), 'test');

SANDBOX_ENV = {
  fs: fs,
  path: path,
  __dirname: __dirname,
  __filename: __filename
};

obj2ast = function(obj) {
  var ast, item, key, list, value, _i, _len;
  switch (typeof obj) {
    case 'undefined':
      return ['name', 'undefined'];
    case 'string':
      return ['string', obj];
    case 'boolean':
    case 'number':
      ast = jsp.parse(obj.toString());
      return ast[1][0][1];
    case 'function':
      ast = jsp.parse("a = " + (obj.toString()));
      return ast[1][0][1][3];
    case 'object':
      if (_.isNull(obj)) {
        return ['name', 'null'];
      } else if (_.isArray(obj)) {
        list = [];
        for (_i = 0, _len = obj.length; _i < _len; _i++) {
          item = obj[_i];
          list.push(obj2ast(item));
        }
        return ['array', list];
      } else {
        list = [];
        for (key in obj) {
          value = obj[key];
          list.push([key, obj2ast(value)]);
        }
        return ['object', list];
      }
  }
  return ["block"];
};

JsLinker = (function() {

  JsLinker.prototype.defaults = {
    src: [],
    dst: null,
    indent: 2,
    compress: true,
    recursive: true,
    wrapAmd: true,
    wrapNs: true,
    defines: {},
    fileExts: ['js']
  };

  function JsLinker(options) {
    if (options == null) options = {};
    jsp.set_logger(function(msg) {
      return console.log(("Parser: " + msg).yellow);
    });
    pro.set_logger(function(msg) {
      return console.log(("Process: " + msg).yellow);
    });
    this.walker = pro.ast_walker();
    this.builder.registerType('jslink', this.jslink, this);
  }

  JsLinker.prototype.jslink = function(name, options) {
    var target, _i, _len, _ref2, _ref3, _results,
      _this = this;
    this.opt = _.defaults(options, this.defaults);
    if (!_.isArray(this.opt.src)) this.opt.src = [this.opt.src];
    this.count = 0;
    this.filter = (_ref2 = new Filter()).allow.apply(_ref2, ['ext'].concat(__slice.call(this.opt.fileExts)));
    if (this.opt.filter != null) {
      if (_.isArray(this.opt.filter.allow)) {
        filter.allowList(this.opt.filter.allow);
      }
      if (_.isArray(this.opt.filter.deby)) filter.denyList(this.opt.filter.deny);
    }
    _ref3 = this.opt.src;
    _results = [];
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      target = _ref3[_i];
      _results.push(walkSync().on('file', function(file, dir, base) {
        var infile, outdir, outfile, _ref4;
        if (!_this.filter.test(file)) return;
        infile = join(base, dir, file);
        outdir = join((_ref4 = _this.opt.dst) != null ? _ref4 : base, dir);
        outfile = join(outdir, basename(file));
        makeDir(outdir);
        return _this.link(infile, outfile);
      }).walk(target));
    }
    return _results;
  };

  JsLinker.prototype.link = function(infile, outfile) {
    var ast, code, moduleNs, modules, opt, self, walk;
    code = fs.readFileSync(infile, 'utf-8');
    ast = jsp.parse(code);
    walk = this.walker.walk;
    modules = [];
    moduleNs = removeExt(relative(ROOT_PATH, infile)).replace('/', '.');
    self = this;
    opt = this.opt;
    ast = this.walker.with_walkers({
      toplevel: function(statements) {
        var ret;
        ret = statements.map(walk);
        console.log('toplevel'.magenta);
        if (opt.wrapNs) ret = self._wrapNamespace(ret, moduleNs);
        if (opt.wrapAmd) ret = self._wrapRequireJs(ret, modules);
        return [this[0], ret];
      },
      call: function(expr, args) {
        var data, i, obj, ret, s, seg, template, _len;
        if (expr[0] === 'name' && expr[1] === '__precompile') {
          code = pro.gen_code(args[0]);
          obj = vm.runInNewContext("" + code + "()", SANDBOX_ENV);
          ret = obj2ast(obj);
          return ret;
        }
        if (expr[0] === 'name' && expr[1] === '__template') {
          path = vm.runInNewContext(pro.gen_code(args[0]), SANDBOX_ENV);
          if (existsSync(path)) {
            path = fs.realpathSync(path);
            data = fs.readFileSync(path, 'utf-8');
            switch (extname(path)) {
              case '.mu':
              case '.mustache':
                template = hogan.compile(data, {
                  asString: true
                });
                ret = jsp.parse("a = " + template);
                return ret[1][0][1][3];
              default:
                return ['string', data];
            }
          } else {
            console.log(("Error: template " + path + " not found!").red);
          }
        }
        if (expr[0] === 'name' && expr[1] === 'require') {
          path = vm.runInNewContext(pro.gen_code(args[0]), SANDBOX_ENV);
          console.log('require'.cyan, path.yellow);
          modules.push(path);
          seg = path.split('/');
          ret = ['name', seg[0]];
          for (i = 0, _len = seg.length; i < _len; i++) {
            s = seg[i];
            if (i === 0) continue;
            ret = ['dot', ret, s];
          }
          return ret;
        }
        if (expr[0] === 'name' && expr[1] === 'include') {
          path = vm.runInNewContext(pro.gen_code(args[0]), SANDBOX_ENV);
          modules.push(path);
          console.log('include'.cyan, path.yellow);
          return ["block"];
        }
        if (expr[0] === 'name' && expr[1] === 'module') {
          moduleNs = vm.runInNewContext(pro.gen_code(args[0]), SANDBOX_ENV);
          console.log('module'.cyan, moduleNs.yellow);
          return ["block"];
        }
        return [this[0], walk(expr), args.map(walk)];
      },
      name: function(name) {
        if (/^\__[A-Z_]+__$/.test(name) && (opt.defines[name] != null)) {
          return obj2ast(opt.defines[name]);
        }
        return this;
      }
    }, function() {
      return walk(ast);
    });
    code = pro.gen_code(ast, {
      beautify: true,
      indent_level: this.opt.indent
    });
    if (this.opt.compress) {
      ast = jsp.parse(code);
      ast = pro.ast_mangle(ast);
      ast = pro.ast_squeeze(ast);
      code = pro.gen_code(ast);
    }
    return fs.writeFileSync(outfile, code, 'utf-8');
  };

  JsLinker.prototype._wrapNamespace = function(ast, moduleName) {
    return [['stat', ['call', ['name', '__ns'], [['string', moduleName], ['function', null, ['exports'], ast]]]]];
  };

  JsLinker.prototype._wrapRequireJs = function(ast, modules) {
    var modAst, module, _i, _len;
    modAst = [];
    for (_i = 0, _len = modules.length; _i < _len; _i++) {
      module = modules[_i];
      modAst.push(['string', module]);
    }
    return [['stat', ['call', ['name', 'define'], [['array', modAst], ['function', null, [], ast]]]]];
  };

  return JsLinker;

})();
