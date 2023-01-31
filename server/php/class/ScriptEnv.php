<?php
/*
领域专用代码（DSL）设计方案

设计在用户代码中可调用的函数、可读写的数据等。
写一个类继承ScriptEnv类，其公有函数和数据即向用户开放的接口数据或函数。

错误日志会记录到scriptenv.log文件。

用户代码受到安全限制，也称为在沙箱中运行：

- 代码须符合php格式，前缀`<?php`可以有也可以没有。
- 不允许使用修改GLOBAL变量，也不允许访问`$_`开头的变量，如$_POST/$_GET等超全局变量。
- 不允许定义函数，一般通过`$env`中的暴露的接口来操作数据，如`$env->get(...)`。
- 可调用的函数通过白名单（$allowedCallInScript 数组）指定。可在子类中添加允许的函数，详见下面示例。

示例：定义一个领域专用代码环境，支持以下接口

- get(名称，属性)
- set(名称，属性，值)

```php
// 实现示例
class ImageComposeScriptEnv extends ScriptEnv
{
	protected $tplContent;

	function __construct(&$tplContent) {
		$this->tplContent = &$tplContent;
		// 如果想要允许调用某些函数，可在这里添加；设置为null则不做检查。
		// array_push($this->allowedCallInScript, "fn1", "fn2");
	}

	function get($name, $attr) {
		...
	}
	function set($name, $attr, $value) {
		...
	}
}

// 沙箱中执行代码示例
$fnCode = 从数据库或文件中读出用户代码
$env = new ImageComposeScriptEnv($tplContent);
$env->execScript($fnCode);

// 用户自定义代码示例
if (mb_strlen($env->get("名字", "value")) > 3) {
	$env->set("名字", "size", 24);
}

```
*/
class ScriptEnv
{
	// 安全检查: 设置允许调用的函数；设置为null则不做检查。
	protected $allowedCallInScript = ["if", "else", "while", "for", "function", "use", "logit", "intval", "doubleval", "floor", "ceil", "round", 
		"preg_match", "preg_replace", "preg_replace_callback", 
		"substr", "strlen", "strpos", "mb_substr", "mb_strlen", "mb_strpos", "foreach", "explode", "str_replace"
	];
	function execScript($script_) {
		$env = $this;
		try {
			// 忽略 ->xxx, //..., #..., "xxx", 'xxx'
			preg_replace_callback('/(\$_\w+)|\b(GLOBALS|global|function|class|new)\b|->\w+|(\w+)\s*\(|(\/\*)|\/\/.*|#.*|"[^"]*"|\'[^\']*\'/iu', function ($ms) {
				if (@$ms[1])
					throw new Exception("var `{$ms[1]}' is NOT allowed");
				else if (@$ms[2])
					throw new Exception("`{$ms[2]}' is NOT allowed");
				else if (@$ms[3] && is_array($this->allowedCallInScript) && !in_array($ms[3], $this->allowedCallInScript))
					throw new Exception("function `{$ms[3]}' is NOT allowed");
				else if (@$ms[4])
					throw new Exception("comment /**/ is NOT allowed");
			}, $script_);
			$script_ = preg_replace('/^<\?php\s*/', '', $script_);
			$rv = eval($script_);
		} catch (Exception $ex) {
			logit($ex, true, "scriptenv");
			if (! ($ex instanceof MyException)) {
				throw new MyException(E_PARAM, $ex->getMessage(), "脚本错误");
			}
			throw($ex);
		}
		return $rv;
	}
}

