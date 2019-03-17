import { TokenStream } from "./tokenizer"
import { InputStream } from "./input"
import { DefaultParser } from "./parser"
import { Environment, evaluate } from "./eval"

const code = "sum = lambda(x, y) x + y; print(sum(2, 3));"
const parser = new DefaultParser(new TokenStream(new InputStream(code)))
const ast = parser.parse()
const globalEnv = new Environment()

globalEnv.define("print", console.log)

evaluate(ast, globalEnv)
