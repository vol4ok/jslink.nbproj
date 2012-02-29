require 'colors'
fs = require 'fs'
path = require 'path'
coffee = require 'coffee-script'
util = require 'util'
_ = require 'underscore'
vm = require 'vm'
hogan = require 'hogan.js'

jsp = require("uglify-js").parser
pro = require("uglify-js").uglify

{inspect} = util
{existsSync, join, dirname, basename, extname, relative} = path

ROOT_PATH = process.cwd()
INDENT = "  "

removeExt = (path) ->
  return join(dirname(path), basename(path, extname(path)))
  
wrapNs = (ast, moduleName) ->
  ret = [ [ 'stat',
          [ 'call',
            [ 'name', '__ns' ],
            [ [ 'string', moduleName ],
              [ 'function',
                null,
                [ 'exports' ], ast ] ] ] ] ]
  return ret

wrapReqJs = (ast, modules) ->
  modAst = []
  for module in modules
    modAst.push [ 'string', module ]
  ret = [ [ 'stat',
          [ 'call',
            [ 'name', 'define' ],
            [ [ 'array', modAst ],
              [ 'function',
                null,
                [], ast ] ] ] ] ]
  return ret
  
objToAst = (obj) ->
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
        list.push(objToAst(item)) for item in obj
        return [ 'array', list ]
      else
        list = []
        list.push([ key, objToAst(value) ]) for key, value  of obj
        return [ 'object', list ]
  return [ 'block' ]
          
sandbox = 
  fs: fs
  path: path
  __dirname: __dirname
  __filename: __filename
  
rand = (n) -> Math.floor(Math.random()*n)
randStr = (length, alphabet) ->
  unless alphabet
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')
  str = ""
  for i in [0...length]
    str += alphabet[rand(alphabet.length)]
  return str
  
genReplacementId = ->
  return "___REPLCEMENT[_#{randStr(32)}]"
  
g_replacements = {}

build = (target) ->
  deps = []
  ext = extname(target)
  unless ext
    if existsSync(target+'.min.js')
      target +=  '.min.js'
    else if existsSync(target+'.js')
      target += '.js'
    else if existsSync(target+'.coffee')
      target += '.coffee'
    ext = extname(target)
  target = fs.realpathSync(target)
  code = fs.readFileSync(target, 'utf-8')
  if ext is '.coffee'
    code = coffee.compile(code, {bare: true, utilities: no})
    
  # console.log inspect(jsp.parse(code), false, null, true)
  # moduleName = removeExt(relative(ROOT_PATH, target)).replace('/','.')
  # code = "__ns(\"#{moduleName}\", function(exports){\n#{code}\n});"
  # console.log inspect(jsp.parse(code), false, null, true)
  
  pro.set_logger (msg) ->
    console.log msg.yellow
  ast = jsp.parse(code)
  w = pro.ast_walker()
  walk = w.walk
  
  defines = 
    '__DEBUG__': true
    '__VERSION__': '0.0.1'
    '__AUTHOR__': 'vol4ok'
  
  ast = w.with_walkers(
    toplevel: (statements) ->
      console.log 'toplevel'.cyan
      moduleName = removeExt(relative(ROOT_PATH, target)).replace('/','.')
      ret = wrapNs(statements, moduleName)
      ret = wrapReqJs(ret, ['sm/module', 'sm/test'])
      #console.log inspect(statements, false, null, true)
      return [ this[0], ret.map(walk) ]
    call: (expr, args) ->
      if expr[0] == 'name' && expr[1] == '__precompile'
        code = pro.gen_code(args[0])
        obj = vm.runInNewContext("#{code}()", sandbox)
        ret = objToAst(obj)
        return ret
      if expr[0] == 'name' && expr[1] == '__template'
        path = vm.runInNewContext(pro.gen_code(args[0]), sandbox)
        path = fs.realpathSync(path)
        data = fs.readFileSync(path, 'utf-8')
        switch extname(path)
          when '.mu', '.mustache'
            template = hogan.compile(data, asString: yes)
            # id = genReplacementId()
            # g_replacements[id] = template
            # return [ 'name', id ]
            ret = jsp.parse("a = #{template}")
            return ret[1][0][1][3]
          else
            return [ 'string', data ]
      else if expr[0] == 'name' && expr[1] == 'require'
        path = vm.runInNewContext(pro.gen_code(args[0]), sandbox)
        console.log 'require'.cyan, path.yellow
        seg = removeExt(relative(ROOT_PATH, path)).split('/')
        ret = ['name', seg[0]]
        for s,i in seg
          continue if i is 0
          ret = ['dot', ret, s]
        return ret
      else if expr[0] == 'name' && expr[1] == 'include'
        path = vm.runInNewContext(pro.gen_code(args[0]), sandbox)
        console.log 'include'.cyan, path.yellow
        return [ "block" ]
        
      else if expr[0] == 'name' && expr[1] == 'module'
        modname = vm.runInNewContext(pro.gen_code(args[0]), sandbox)
        console.log 'module'.cyan, modname.yellow
        return [ "block" ]
      return [ this[0], walk(expr), args.map(walk) ];
    name: (name) ->
      if /^\__[A-Z_]+__$/.test(name) and defines[name]?
        return objToAst(defines[name])
      return this
  , -> return walk(ast))
  
  #ast = pro.ast_mangle(ast, {defines: {DEBUG: ['name', 'false']}})
  #ast = pro.ast_squeeze(ast, {dead_code: yes, make_seqs: no})
  
  #console.log inspect(ast, false, null, true)
  code = pro.gen_code(ast, {beautify: yes, indent_level: 2})
  for key, val of g_replacements
    console.log key
    code = code.replace(key, val)
  
  outputPath = join(ROOT_PATH, 'build', basename(target, ext)+'.js')
  fs.writeFileSync(outputPath, code, 'utf-8')
  build(dep) for dep in deps
  
build('sm/main.coffee')