require 'colors'
fs     = require 'fs'
path   = require 'path'
vm     = require 'vm'
_      = require 'underscore'
hogan  = require 'hogan.js'
coffee = require 'coffee-script'

jsp = require("uglify-js").parser
pro = require("uglify-js").uglify

{walkSync} = require 'fs.walker'
Filter = require 'path.filter'
{makeDir, setExt, removeExt} = require 'fs.utils'
{join, dirname, basename, extname, normalize, relative, existsSync} = path
{inspect} = require 'util'

removeExt = (path) ->
  return join(dirname(path), basename(path, extname(path)))

ROOT_PATH = join(process.cwd(), 'test')
SANDBOX_ENV =
  fs: fs
  path: path
  __dirname: __dirname
  __filename: __filename

obj2ast = (obj) ->
  switch typeof obj
    when 'undefined'
      return [ 'name', 'undefined' ]
    when 'string'
      return [ 'string', obj ]
    when 'boolean', 'number'
      ast = jsp.parse(obj.toString())
      return ast[1][0][1]
    when 'function'
      ast = jsp.parse("a = #{obj.toString()}")
      return ast[1][0][1][3]
    when 'object'
      if _.isNull(obj)
        return [ 'name', 'null' ]
      else if _.isArray(obj)
        list = []
        list.push(obj2ast(item)) for item in obj
        return [ 'array', list ]
      else
        list = []
        list.push([ key, obj2ast(value) ]) for key, value  of obj
        return [ 'object', list ]
  return [ "block" ]

class JsLinker
  defaults: 
    src: []
    dst: null
    indent: 2
    compress: yes
    recursive: yes
    wrapAmd: yes
    wrapNs: yes
    defines: {}
    fileExts: [ 'js' ]
        
  constructor: (options = {}) ->
    jsp.set_logger (msg) -> console.log "Parser: #{msg}".yellow
    pro.set_logger (msg) -> console.log "Process: #{msg}".yellow
    @walker = pro.ast_walker()
    @builder.registerType('jslink', @jslink, this)

  jslink: (name, options) ->
    @opt = _.defaults(options, @defaults)
    @opt.src = [ @opt.src ] unless _.isArray(@opt.src)
    @count = 0
    @filter = new Filter().allow('ext', @opt.fileExts...)
    if @opt.filter?
      filter.allowList(@opt.filter.allow) if _.isArray(@opt.filter.allow)
      filter.denyList(@opt.filter.deny)   if _.isArray(@opt.filter.deby)
    for target in @opt.src 
      walkSync()
        .on 'file', (file, dir, base) => 
          return unless @filter.test(file)
          infile  = join(base, dir, file)
          outdir = join(@opt.dst ? base, dir)
          outfile = join(outdir, basename(file))
          makeDir(outdir)
          @link(infile, outfile)
        .walk(target)

  link: (infile, outfile) ->
    code = fs.readFileSync(infile, 'utf-8')
    ast = jsp.parse(code)
    walk = @walker.walk
    modules = []
    moduleNs = removeExt(relative(ROOT_PATH, infile)).replace('/','.')
    self = this
    opt = @opt
    ast = @walker.with_walkers(
      toplevel: (statements) -> 
        ret = statements.map(walk)
        console.log 'toplevel'.magenta
        ret = self._wrapNamespace(ret, moduleNs) if opt.wrapNs
        ret = self._wrapRequireJs(ret, modules) if opt.wrapAmd
        return [ this[0], ret ]
      call: (expr, args) ->
        if expr[0] == 'name' && expr[1] == '__precompile'
          code = pro.gen_code(args[0])
          obj = vm.runInNewContext("#{code}()", SANDBOX_ENV)
          ret = obj2ast(obj)
          return ret
        if expr[0] == 'name' && expr[1] == '__template'
          path = vm.runInNewContext(pro.gen_code(args[0]), SANDBOX_ENV)
          if existsSync(path)
            path = fs.realpathSync(path)
            data = fs.readFileSync(path, 'utf-8')
            switch extname(path)
              when '.mu', '.mustache'
                template = hogan.compile(data, asString: yes)
                ret = jsp.parse("a = #{template}")
                return ret[1][0][1][3]
              else
                return [ 'string', data ]
          else
            console.log "Error: template #{path} not found!".red
        if expr[0] == 'name' && expr[1] == 'require'
          path = vm.runInNewContext(pro.gen_code(args[0]), SANDBOX_ENV)
          console.log 'require'.cyan, path.yellow
          modules.push(path)
          seg = path.split('/')
          ret = ['name', seg[0]]
          for s,i in seg
            continue if i is 0
            ret = ['dot', ret, s]
          return ret
        if expr[0] == 'name' && expr[1] == 'include'
          path = vm.runInNewContext(pro.gen_code(args[0]), SANDBOX_ENV)
          modules.push(path)
          console.log 'include'.cyan, path.yellow
          return [ "block" ]
        if expr[0] == 'name' && expr[1] == 'module'
          moduleNs = vm.runInNewContext(pro.gen_code(args[0]), SANDBOX_ENV)
          console.log 'module'.cyan, moduleNs.yellow
          return [ "block" ]
        return [ this[0], walk(expr), args.map(walk) ]
      name: (name) ->
        if /^\__[A-Z_]+__$/.test(name) and opt.defines[name]?
          return obj2ast(opt.defines[name])
        return this
    , -> return walk(ast))
    
    #console.log inspect(ast, false, null, true)

    code = pro.gen_code(ast, {beautify: yes, indent_level: @opt.indent})
    if @opt.compress
      ast = jsp.parse(code)
      ast = pro.ast_mangle(ast)
      ast = pro.ast_squeeze(ast)
      code = pro.gen_code(ast)
    fs.writeFileSync(outfile, code, 'utf-8')
    
  _wrapNamespace: (ast, moduleName) ->
    return [ [ 'stat',
             [ 'call',
               [ 'name', '__ns' ],
               [ [ 'string', moduleName ],
                 [ 'function',
                   null,
                   [ 'exports' ], ast ] ] ] ] ]

  _wrapRequireJs: (ast, modules) ->
    modAst = []
    for module in modules
      modAst.push [ 'string', module ]
    return [ [ 'stat',
             [ 'call',
               [ 'name', 'define' ],
               [ [ 'array', modAst ],
                 [ 'function',
                   null,
                   [], ast ] ] ] ] ]