module 'main'
include 'jquery'
include 'underscore'

data = __template 'build/index.html'


Module1 = require "sm/"+"module"

f = () -> console.log "ololo"

class ClassA
  A: __precompile -> return {test: 123, test2: "24234", test3: [1,2,3]}
  constructor: ->
    @temp = require "sm/module"
  method1: ->
    @Tmpl = __template "build/index.mu"
    
exports extends {ClassA}