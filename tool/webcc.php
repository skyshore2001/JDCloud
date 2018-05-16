<?php

/**

@module webcc 站点发布优化工具

Webcc用于Web站点优化，即生成用于发布的Web应用目录。
一般要求源代码使用git管理，通过git命令查询源文件列表及版本差异，实现增量编译、自动化发布等功能。

也可以脱离git独立使用，这时要求指定源文件列表，通过设置环境变量WEBCC_LS_CMD，例如：

	export WEBCC_LS_CMD='find . -type f'
	# export WEBCC_LS_CMD='find . -type f | grep -v .svn | grep -v .git'
	# export WEBCC_LS_CMD='svn ls -R | egrep -v "/$"'
	webcc {srcDir}

webcc进入{srcDir}目录，执行`WEBCC_LS_CMD`命令得到源文件列表，分别进行处理，生成发布目录，默认为"output_web"目录。

注意：

- 修改webcc.conf.php会导致rebuild
- 如果想强制rebuild, 可以删除输出文件夹下的revision.txt, 比如当修改webcc.php后。
- 如果本地有未提交的内容，也会更新到输出文件夹。
- 设置环境变量 DBG_LEVEL=1 显示调试信息

Usage:

	处理源目录，生成发布目录
	webcc {srcDir} [-o {outDir=output_web}]

	webcc单个命令调用
	webcc -cmd {cmd} [-o {outFile}] [-minify yes]

webcc命令可在html文件中使用，例如做JS/CSS合并压缩：

	<!-- WEBCC_BEGIN MERGE=lib-app -->
	<link rel="stylesheet" href="lib/mui.css" />
	<link rel="stylesheet" href="app.css" />

	<script src="lib/common.js"></script>
	<script src="lib/app_fw.js"></script>
	<script src="app.js"></script>
	<!-- WEBCC_END -->

WEBCC_BEGIN后面，用MERGE=输出文件基本名(basename)的格式(不要写全名如`lib-app.js`), `MERGE=lib-app`表示根据link及script标签自动合并生成 lib-app.min.js / lib-app.min.css。

它等价于

	<!-- WEBCC_BEGIN -->
	<link rel="stylesheet" href="lib/mui.css" />
	<link rel="stylesheet" href="app.css" />

	<script src="lib/common.js"></script>
	<script src="lib/app_fw.js"></script>
	<script src="app.js"></script>
	<!-- WEBCC_USE_THIS
	// 除了//开头的注释和 WEBCC_CMD 开头的命令，其它部分均直接输出
	WEBCC_CMD mergeCss -o lib-app.min.css -minify yes lib/mui.css app.css
	WEBCC_CMD mergeJs -o lib-app.min.js -minify yes lib/common.js lib/app_fw.js app.js
	WEBCC_END -->

WEBCC_USE_THIS标识可区分开发时用的内容和发布时用的内容，例如开发时和发布后使用两套JS，可以这样设置：

	<!-- WEBCC_BEGIN -->
		<script src="lib/react/react.development.js"></script>
		<script src="lib/react/react-dom.development.js"></script>
	<!-- WEBCC_USE_THIS
		<script src="lib/react/react.production.min.js"></script>
		<script src="lib/react/react-dom.production.min.js"></script>
	WEBCC_END -->

这就支持开发时使用development版本的库，而发布时使用production版本的库。
用多个库时常常通过设置MERGE来合并，比如

	<!-- WEBCC_BEGIN MERGE=react -->
		<script src="lib/react/react.development.js"></script>
		<script src="lib/react/react-dom.development.js"></script>
	<!-- WEBCC_USE_THIS
		<script src="lib/react/react.production.min.js"></script>
		<script src="lib/react/react-dom.production.min.js"></script>
	WEBCC_END -->

发布时可将两个production的库合并成一个react.min.js文件。

如果要内嵌JS/CSS，在MERGE后不指定名称即可：

	<!-- WEBCC_BEGIN MERGE -->
	<link rel="stylesheet" href="index.css" />
	<link rel="stylesheet" href="icon.css" />
	<script src="index.js"></script>
	<!-- WEBCC_END -->

它等价于

	<!-- WEBCC_BEGIN -->
	<link rel="stylesheet" href="index.css" />
	<link rel="stylesheet" href="icon.css" />
	<script src="index.js"></script>
	<!-- WEBCC_USE_THIS
	<style>
	WEBCC_CMD mergeCss -minify yes index.css icon.css
	</style>
	<script>
	WEBCC_CMD mergeJs -minify yes index.js
	</script>
	WEBCC_END -->

在发布时，WEBCC_BEGIN到WEBCC_USE_THIS下的内容将被移除，而 WEBCC_USE_THIS到 WEBCC_END间的内容被保留到发布版本中。
如果其中出现形如 `WEBCC_CMD {cmd} {args}` 的内容，则会调用webcc命令做处理。

当在webcc.conf.php中指定HASH规则时，上述webcc命令将会执行。例：

	$RULES = [
		'm2/index.html' => 'HASH',
	]

注意：

- 如果使用了-o选项，则将内容输出到指定文件，当前位置出现 `<script src="lib-app.min.js?v=125432">` 之类的可嵌入标签。
  如果不使用-o选项，则内容直接输出到当前位置。
- 选项 -minify yes 会压缩 js/css内容（对文件名中含有min分词的文件如`jquery.min.js`, `juicer-min.js`不做压缩），默认不压缩。
- 允许多个页面执行相同的命令生成相同的文件（实际只会执行一次）
	但如果命令不同而却指定相同的文件，例如以下两个命令都生成lib-app.min.js, 但参数不同，就会报错，以保证文件一致：

		<!-- WEBCC_BEGIN -->
		...
		<!-- WEBCC_USE_THIS
		WEBCC_CMD mergeJs -o lib-app.min.js -minify yes lib/common.js lib/app_fw.js app.js
		WEBCC_CMD mergeJs -o lib-app.min.js -minify yes lib/common.js lib/app_fw.js app2.js
		WEBCC_END -->

@see webcc-mergeJs 合并及压缩JS
@see webcc-mergeCss 合并CSS
@see webcc-mergePage 合并逻辑页

@key webcc.conf.php webcc配置

用法可参考文档：[Web应用部署](Web应用部署.html)


@key __HASH__  hash标识

格式：

	{file}?__HASH__

或可指定相对于当前文件的相对路径{relDir}，一般用于js文件中。

	{file}?__HASH__,{relDir}

例如：

	loadScript("cordova/cordova.js?__HASH__,.."); // 表示该文件相对当前文件的路径应该是 ../cordova/cordova.js 
	loadScript("cordova-ios/cordova.js?__HASH__,../m"); // 表示该文件相对当前文件的路径应该是 ../m/cordova-ios/cordova.js

 */


/*
程序运行时，当前目录为源目录。处理文件时，一般名称相对于源目录。
制定命名规范如下：

$fi - 可访问的源文件，相对路径，如 "m2/index.html"
$outf - 可访问的目标文件，绝对路径，$outf = $g_opts['outDir'] . '/' . $fi,  如 "c:/myapp-online/m2/index.html"
$outf0,$f/$f0 - 原始文件，可能不能访问，需要加前缀。
$outf1, $f1 - 对f0,f进行加工后的临时变量
 */

//====== global {{{
$KNOWN_OPTS_FOR_CMD = ['o', 'usePageTemplate', 'minify'];
$KNOWN_OPTS = array_merge(['o', 'cmd'], $KNOWN_OPTS_FOR_CMD);

$DEF_OPTS_FOR_CMD = [
	"args" => [],
	"minify" => false,
	"usePageTemplate" => false, // 目前"template"标签的兼容性还不够，先使用script标签
];

$g_opts = array_merge([
	"srcDir" => null,
	"outDir" => "output_web",
	"cmd" => null
], $DEF_OPTS_FOR_CMD);

$g_handledFiles = []; // elem: $file => 1
$g_hash = []; // elem: $file => $hash

const CFG_FILE = "webcc.conf.php";
$COPY_EXCLUDE = [];

// 设置环境变量 DBG_LEVEL=1 显示调试信息
$DBG_LEVEL = (int)getenv("P_DEBUG") ?: 0;

$g_changedFiles = [];
$g_isRebuild = true;

$g_fakeFiles = [];

$g_useGit = true;
//}}}

// ====== external cmd {{{
class WebccCmd 
{
	// "-o out.js lib/a.js b.js" => opts={o: "out.js", args: ["lib/a.js", "b.js"]}
	protected $opts; // {args, ...}
	protected $isInternalCall = false;
	protected $relDir = ''; // 相对路径
	protected $basef = 'none'; // 调用webcc命令的文件
	static protected $cmds = []; # 已生成的文件，用于检查命令冲突，elem: $outFile => {argstr=命令行参数, basef=出自哪个文件}

	// return: $fi: 源文件相对路径（可访问）；$outf: 目标文件全路径
	protected function checkSrc($f, $fnName, &$outf = null)
	{
		$fi = $f;
		if ($this->relDir)
			$fi = $this->relDir . '/' . $f;
		$fi = formatPath($fi);
		if (! is_file($fi)) {
			die1("*** $fnName fails: cannot find source file `$fi` used by `{$this->basef}`\n");
		}

		if ($this->isInternalCall) {
			global $g_opts;
			$outf = formatPath($g_opts['outDir'] . "/" . $fi);
			handleOne($fi, $g_opts['outDir'], true);
			if (! is_file($outf))
				die1("*** $fnName fails: cannot find handled file $fi: $outf\n");
		}
		else {
			$outf = $fi;
		}

		return $fi;
	}

	static function execAndGetStr($cmd, $args, $isInternalCall, $relDir = null, $basef = null)
	{
		ob_start();
		self::exec($cmd, $args, $isInternalCall, $relDir, $basef);
		$s = ob_get_contents();
		ob_end_clean();
		return $s;
	}

	// relDir: 相对路径，即访问文件时，应该用 relDir + '/' + 文件中的路径
	static function exec($cmd, $args, $isInternalCall, $relDir = null, $basef = null)
	{
		try {
			$fn = new ReflectionMethod('WebccCmd', $cmd);
			$cmdObj = new WebccCmd();
			$cmdObj->basef = $basef;

			global $g_opts;
			if (! $isInternalCall) {
				$cmdObj->opts = $g_opts;
			}
			else {
				global $KNOWN_OPTS_FOR_CMD, $DEF_OPTS_FOR_CMD;
				$cmdObj->opts = $DEF_OPTS_FOR_CMD;
				readOpts($args, $KNOWN_OPTS_FOR_CMD, $cmdObj->opts);
			}
			if ($relDir && $relDir != '.') {
				$cmdObj->relDir = $relDir;
			}
			$cmdObj->isInternalCall = $isInternalCall;

			$params = $fn->getParameters();
			if (count($cmdObj->opts['args']) < count($params)) {
				die1("*** missing param for command: $cmd\n");
			}

			// 如果指定-o, 则重定向输出到指定文件
			@$outf0 = $cmdObj->opts['o']; // 相对路径
			$fi = null;
			$skipCall = false;
			global $g_handledFiles, $g_hash;
			if (isset($outf0)) {
				if ($cmdObj->relDir)
					$fi = formatPath($cmdObj->relDir . "/" . $outf0);
				else
					$fi = formatPath($outf0);

				// 检查文件是否已生成过且命令行一致
				@$info = self::$cmds[$fi];
				if ($info) {
					$argstr = formatArgs($args);
					if ($info['argstr'] != $argstr) {
						die1("*** out file `$fi` mismatch:
  {$info['basef']} calls: `{$info['argstr']}`
  $basef calls: `$argstr`\n");
					}
				}
				else {
					self::$cmds[$fi] = [
						'argstr' => formatArgs($args),
						'basef' => $cmdObj->basef
					];
				}

				if (array_key_exists($fi, $g_handledFiles))
					$skipCall = true;
				else
					ob_start();
			}
			if (!$skipCall)
				echo $fn->invokeArgs($cmdObj, $cmdObj->opts['args']);
			if (isset($outf0)) {
				$outf = $outf0;
				if ($isInternalCall) {
					$outf = $g_opts['outDir'] . "/" . $fi;
					@mkdir(dirname($outf), 0777, true);
				}
				if (! $skipCall) {
					$s = ob_get_contents();
					ob_end_clean();

					file_put_contents($outf, $s);
					$hash = fileHash($outf);
					$g_handledFiles[$fi] = 1;
					$g_hash[$fi] = $hash;
					logit("=== generate $fi\n");
				}
				else {
					$hash = @$g_hash[$fi] ?: fileHash($outf);
				}

				$outf1 = "$outf0?v=$hash"; // 相对路径
				if ($cmd == 'mergeCss') {
					echo "<link rel=\"stylesheet\" href=\"$outf1\" />\n";
				}
				else if ($cmd == 'mergeJs') {
					echo "<script src=\"$outf1\"></script>\n";
				}
				else {
					echo "<script type=\"text/plain\" src=\"$outf1\"></script>\n";
				}
			}
		}
		catch (ReflectionException $ex) {
			die1("*** unknown webcc command: $cmd\n");
		}
	}

/**
@fn webcc-mergeCss CSS合并

	webcc -cmd mergeCss {cssFile1} ... [-o {outFile}]

CSS合并，以及对url相对路径进行修正。

例：

	webcc -cmd mergeCss lib/a.css b.css -o out.css

注意：只处理相对路径，带协议的情况不处理：

	url(data:...)
	url(http:...)

路径处理示例：

	// 处理 url(...) 中的路径
	eg.  srcDir='lib', outDir='.'
	curDir='.' (当前路径相对outDir的路径)
	prefix = {curDir}/{srcDir} = ./lib = lib
	url(1.png) => url(lib/1.png)
	url(../image/1.png) => url(lib/../image/1.png) => url(image/1.png)

	eg2. srcDir='lib', outDir='m2/css'
	curDir='../..' (当前路径相对outDir的路径)
	prefix = {curDir}/{srcDir} = ../../lib
	url(1.png) => url(../lib/1.png)
	url(../image/1.png) => url(../../lib/../image/1.png) => url(../../image/1.png) (lib/..被合并)

	TODO: 暂不支持eg3的情况，即outFile不允许以".."开头。
	eg3. srcDir='lib', outDir='../m2/css'
	curDir='../../html' (假设当前实际dir为'prj/html')
	prefix = {curDir}/{srcDir} = ../../html/lib
	url(1.png) => url(../../html/lib/1.png)
	url(../image/1.png) => url(../../html/lib/../image/1.png) => url(../../html/image/1.png)

*/
	public function mergeCss($cssFile1)
	{
		$outDir = '.';
		if (isset($this->opts['o']))
			$outDir = dirname($this->opts['o']);
		foreach (func_get_args() as $f0) {
			$fi = $this->checkSrc($f0, "mergeCss", $outf);
			$srcDir = dirname($f0);
			$s = $this->getFile($outf);
			if ($outDir != $srcDir) {
				// TODO: 暂不支持eg3的情况，即outDir不允许以".."开头。
				$prefix = preg_replace('/\w+/', '..', $outDir);
			   	if ($srcDir != '.')
					$prefix .= '/' . $srcDir;

				// url模式匹配 [^'":]+  不带冒号表示不含有协议
				$s = preg_replace_callback('/\burl\s*\(\s*[\'"]?\s*([^\'": ]+?)\s*[\'"]?\s*\)/', function ($ms) use ($prefix){
					if ($prefix != '.') {
						$url = $prefix . '/' . $ms[1];
						// 简单压缩路径，如 "./aa/bb/../cc" => "aa/cc"
						$url = preg_replace('`(^|/)\K\./`', '', $url); // "./xx" => "xx", "xx/./yy" => "xx/yy"
						$url = preg_replace('`\w+/\.\./`', '', $url);
					}
					else {
						$url = $ms[1];
					}
					return "url($url)";
				}, $s);
			}
			echo "/* webcc-css: $fi */\n";
			echo $s;
			echo "\n";
		}
	}

/**
@fn webcc-mergePage 逻辑页合并

	webcc -cmd mergePage {page1} ... [-usePageTemplate yes]

将逻辑页的html文件及其链接的js文件，处理后嵌入主html。

例：命令行

	webcc -cmd mergePage ../server/m2/page/home.html

例：在html中隐式调用

	<!-- WEBCC_BEGIN -->
	page/home.html
	page/login.html
	page/login1.html
	page/me.html
	<!-- WEBCC_END -->

	<!-- WEBCC_BEGIN -->
	<!-- WEBCC_USE_THIS
	WEBCC_CMD mergePage page/home.html page/login.html page/login1.html page/me.html
	WEBCC_END -->

注意：

- 使用mergePage时，会将子页面html/js并入主页面，要求子页面js中不可出现script标签（因为嵌入主页时使用了script，而script不可嵌套）
- mergePage命令不应使用-o选项，因为html文件无法包含一个html片段。

支持两种方式：(通过选项 "-usePageTemplate 1" 选择)

例如，逻辑页order.html引用order.js，格式为：

	<div mui-initfn="initPageOrder" mui-script="order.js">
	</div>

1. 使用script标签嵌入主页面（缺省）：

		<script type="text/html" id="tpl_order">
			<!-- order.html内容, 其mui-script属性被删除，代之以直接嵌入JS内容 -->
			<div mui-initfn="initPageOrder" >
			</div>
		</script>

		<script>
		// order.js内容
		</script>

2. 使用template标签嵌入主页面（H5标准，目前兼容性还不够）：

		<template id="tpl_order">
		<!-- order.html 内容 -->
		<div mui-initfn="initPageOrder" >
			<script>
			// order.js内容
			</script>
		</div>
		</template>

*/
	public function mergePage($pageFile1)
	{
		$me = $this;
		foreach (func_get_args() as $f0) {
			$fi = $this->checkSrc($f0, "mergePage", $outf);
			$srcDir = dirname($fi);
			// html因注释内容少，暂不做minify
			$html = file_get_contents($outf);
			//$html = $this->getFile($outf);
			$html = preg_replace_callback('`(<div.*?)mui-script=[\'"]?([^\'"]+)[\'"]?(.*?>) |
				<style>\K(.+?)(?=</style>)
			`sxi',
			function($ms) use ($srcDir, $me) {
				@list ($all, $divPart1, $jsFile, $divPart2, $css) = $ms;
				$ret = null;
				if ($divPart1) {
					$js = $srcDir . '/' . $jsFile;
					if (! is_file($js)) {
						die1("*** mergePage fails: cannot find js file `$js` used by `{$me->basef}`\n");
					}
					return $divPart1 . $divPart2 . "\n<script>\n// webcc-js: {$jsFile}\n" . $me->getFile($js) . "\n</script>\n";
				}
				else if ($css) {
					if ($me->opts['minify']) {
						$f = 'tmp.css';
						file_put_contents($f, $css);
						$ret = "\n" . $this->cssMin($f) . "\n";
					}
					else {
						$ret = $all;
					}
				}
				return $ret;
			}, $html);

			$pageId = basename($f0, ".html");

			echo "<!-- webcc-page: $fi -->\n";
			if ($me->opts['usePageTemplate']) {
				echo "<template id=\"tpl_{$pageId}\">\n";
				echo $html;
				echo "</template>\n\n";
			}
			else {
				echo "<script type=\"text/html\" id=\"tpl_{$pageId}\">\n";
				// 使用 __script__ 避免script标签嵌套，在app_fw.js中处理__script__并还原。
				$html = preg_replace('`</?\K\s*script\s*(?=>)`', '__script__', $html);
				echo $html;
				echo "</script>\n\n";
			}
		}
	}

	protected function getFile($f)
	{
		if (!$this->opts['minify'] || preg_match('/\bmin\b/', $f)) {
			return file_get_contents($f);
		}
		if (substr($f, -3) ==  '.js')
			return $this->jsmin($f);
		else if (substr($f, -4) == '.css')
			return $this->cssmin($f);
		return file_get_contents($f);
	}

	protected function cssMin($f)
	{
		return $this->minify($f, 'cssmin');
	}

	// return: min js
	protected function jsmin($f)
	{
		return $this->minify($f, 'jsmin');
	}

	protected function minify($f, $prog)
	{
		$fp = fopen($f, "r");
		$minExe = __DIR__ . '/' . $prog;
		$h = proc_open($minExe, [ $fp, ["pipe", "w"], STDERR ], $pipes);
		if ($h === false) {
			die1("*** error: require tool `$prog'\n");
		}
		fclose($fp);
		$ret = stream_get_contents($pipes[1]);
		fclose($pipes[1]);
		$rv = proc_close($h);
		if ($rv != 0) {
			die1("*** error: $prog fails to run.\n");
		}
		return $ret;
	}

/**
@fn webcc-mergeJs JS合并及压缩

	webcc -cmd mergeJs {jsFile1} ... [-o {outFile}]

将js文件合并生成一个文件，并做简单压缩处理（去注释、压缩空白）
如果源文件名含有.min.js(如jquery.min.js)，则认为已压缩，不重新压缩。

例：

	webcc -cmd mergeJs lib/jquery.min.js lib/app_fw.js app.js [-o lib_app.js]

在压缩时，需要用到外部jsmin工具，该工具在webcc相同目录下。
 */
	public function mergeJs($jsFile1)
	{
		foreach (func_get_args() as $f0) {
			$fi = $this->checkSrc($f0, "mergeJs", $outf);
			echo "// webcc-js: $fi\n";
			echo $this->getFile($outf);
			echo "\n";
		}
	}
}
// }}}

// ====== functions {{{
// 注意：die返回0，请调用die1返回1标识出错。
function die1($msg)
{
	@ob_end_clean();
	fwrite(STDERR, $msg);
	exit(1);
}

function logit($s, $level=1)
{
	global $DBG_LEVEL;
	if ($DBG_LEVEL >= $level)
		fwrite(STDERR, $s);
}

// 将当前路径加入PATH, 便于外部调用同目录的程序如jsmin
function addPath($prog)
{
	$path = realpath(dirname($prog));
	if ($path === false)
		return;
	putenv("PATH=" . $path . PATH_SEPARATOR . getenv("PATH"));
}

// "xx\yy//zz" => "xx/yy/zz"
// "xx/zz/../yy" => "xx/yy"
// "./xx/./yy" => "xx/yy"
function formatPath($f)
{
	$f = preg_replace('/[\\\\\/]+/', '/', $f);
	$f = preg_replace('`[^/]+/\.\./`', '', $f);
	$f = preg_replace('`(^|/)\K\./`', '', $f);
	return $f;
}

function formatArgs($arr)
{
	return join(' ', $arr);
}

function matchRule($rule, $file)
{
	return fnmatch($rule, $file);
}

function getFileHash($basef, $f, $outDir, $relativeDir = null)
{
	global $g_hash;
	global $g_handledFiles;
	if ($relativeDir == null) {
		$relativeDir = dirname($basef);
	}
	else {
		$relativeDir = dirname($basef) . "/" . $relativeDir;
	}
	$fi = formatPath($relativeDir . "/$f");
	$outf = $outDir . "/" . $fi;
	if (!is_file($outf) || !array_key_exists($fi, $g_handledFiles))
		handleOne($fi, $outDir, true);
	if (!is_file($outf)) {
		global $g_fakeFiles;
		if (! in_array($fi, $g_fakeFiles))
			print("!!! warning: missing file `$fi` used by `$basef`\n");
		$hash = '000000';
	}
	else {
		@$hash = $g_hash[$fi];
	}
	if ($hash == null) {
		$hash = fileHash($outf);
		$g_hash[$fi] = $hash;
// 		echo("### hash {$fi}\n");
	}
	else {
// 		echo("### reuse hash({$fi})\n");
	}
	return $hash;
}

/*
return: [ @jsfiles, @cssfiles], 如果没有js文件则返回jsfiles空数组，cssfiles类似。
例：

	<link rel="stylesheet" href="lib/mui.css?v=1" />
	<link rel="stylesheet" href="app.css" />
	<!--link rel="stylesheet" href="app2.css" /-->

	<script src="lib/common.js"></script>
	<script src="lib/app_fw.js"></script>
	<script src="app.js"></script>

返回：

	[
		"cssfiles" => ["lib/mui.css", "app.css"],
		"jsfiles" => ["lib/common.js", "lib/app_fw.js", "app.js"]
	]

注意：
- 去除注释
- 文件名含有"?v=1"应去除
 */
function parseJsCss($html)
{
	$ret = ['cssfiles'=>[], 'jsfiles'=>[]];
	preg_replace_callback('`<!--.*?--> | 
		<script\s+ [^>]*? \bsrc=[\'"]?([^\'">?]+) |
		<link\s+ [^>]*? \bhref=[\'"]?([^\'">?]+)
		`xsi',
	function($ms) use (&$ret) {
		@list($all, $js, $css) = $ms;
		if ($js)
			$ret['jsfiles'][] = $js;
		if ($css)
			$ret['cssfiles'][] = $css;
	}, $html);

	return $ret;
}

// return: handled content
function handleWebccBlock($content, $basef)
{
	$relDir = dirname($basef);
	$content = preg_replace_callback('/
		^.*WEBCC_BEGIN(\s+MERGE(?:=(\S+))?)?.*$ 
		((?:.|\n)*?)
		(?:^.*WEBCC_USE_THIS.*$[\r\n]*
			((?:.|\n)*?)
		)?
		^.*WEBCC_END.*$[\r\n]*
	/xm', 
	function ($ms) use ($relDir, $basef) {
		@list($all, $doMerge, $outName, $content, $useContent) = $ms;
		$ret = '';
		if ($doMerge) {
			$rv = parseJsCss($useContent ?: $content);
			$commonArgs = ['-minify', 'yes'];

			if (!empty($rv['cssfiles'])) {
				if ($outName) {
					$args = array_merge($commonArgs, ['-o', "$outName.min.css"], $rv['cssfiles']);
				}
				else {
					$args = array_merge($commonArgs, $rv['cssfiles']);
				}
				$s = WebccCmd::execAndGetStr('mergeCss', $args, true, $relDir, $basef);
				if ($outName) {
					$ret .= $s;
				}
				else {
					$ret .= "<style>\n$s\n</style>\n";
				}
			}
			if (!empty($rv['jsfiles'])) {
				if ($outName) {
					$args = array_merge($commonArgs, ['-o', "$outName.min.js"], $rv['jsfiles']);
				}
				else {
					$args = array_merge($commonArgs, $rv['jsfiles']);
				}
				$s = WebccCmd::execAndGetStr('mergeJs', $args, true, $relDir, $basef);
				if ($outName) {
					$ret .= $s;
				}
				else {
					$ret .= "<script>\n$s\n</script>\n";
				}
			}
		}

		if ($useContent && !$doMerge) {
			// 去除注释
			$useStr = preg_replace('`\s*//.*$`m', '', $useContent);
			$useStr = preg_replace_callback('/\bWEBCC_CMD\s+(\w+)\s*(.*?)\s*$/m', 
			function ($ms1) use ($relDir, $basef) {
				list($cmd, $args) = [$ms1[1], preg_split('/\s+/', $ms1[2])];
				$s = WebccCmd::execAndGetStr($cmd, $args, true, $relDir, $basef);
				return $s;
			}, $useStr);
			if ($ret != '')
				$ret .= $useStr;
			else
				$ret = $useStr;
		}
		return $ret;
	}, $content);

	return $content;
}

// <script src="main.js?__HASH__"></script>
// loadScript("cordova/cordova.js?__HASH__,m2)");  -> m2/cordova/cordova.js
// 如果inputFile非空，直接读取它; 如果为null, 则用$f作为输入。
function handleHash($f, $outDir, $inputFile = null)
{
	if ($inputFile == null)
		$inputFile = $f;
	$s = file_get_contents($inputFile);

	if (preg_match('/\.html/', $f)) {
		$s = handleWebccBlock($s, $f);
	}

	$s = preg_replace_callback('/"([^"]+)\?__HASH__(?:,([^"]+))?"/',
	function ($ms) use ($f, $outDir) {
		$relativeDir = @$ms[2];
		$hash = getFileHash($f, $ms[1], $outDir, $relativeDir);
		return '"' . $ms[1] . '?v=' . $hash . '"';
	}, $s);

	$outf = $outDir . "/" . $f;
	@mkdir(dirname($outf), 0777, true);
// 	echo("=== hash $f\n");
	file_put_contents($outf, $s);
}

function handleCopy($f, $outDir)
{
	$outf = $outDir . "/" . $f;
	@mkdir(dirname($outf), 0777, true);
//	echo("=== copy $f\n");

	// bugfix: 目标系统是linux, 复制时对shell文件（要求以.sh为扩展名）自动做转换
	$dos2unix = (PHP_OS == "WINNT" && preg_match('/\.sh/', $f));
	if ($dos2unix) {
		$s = preg_replace('/\r/', '', file_get_contents($f));
		file_put_contents($outf, $s);
		return;
	}

	copy($f, $outf);
}

function handleFake($f, $outDir)
{
	global $g_fakeFiles;
	$g_fakeFiles[] = $f;
}

// return: false - skipped
// force=true: 即使在$FILES未指定也强制生成
function handleOne($f, $outDir, $force = false)
{
	global $FILES;
	global $RULES;
	global $COPY_EXCLUDE;
	global $g_handledFiles;

	$fi = formatPath($f);
	// $FILES设置一般用于调试 单个文件
	if (!$force && isset($FILES)) {
		$skip = true;
		foreach ($FILES as $re) {
			if (matchRule($re, $fi)) {
				$skip = false;
				break;
			}
		}
		if ($skip)
			return false;
	}

	if (array_key_exists($fi, $g_handledFiles))
		return;
	$g_handledFiles[$fi] = 1;

	$rule = null;
	if (isset($RULES)) {
		foreach ($RULES as $re => $v) {
			if (matchRule($re, $fi)) {
				$rule = $v;
				break;
			}
		}
	}
	if (isset($rule))
	{
		logit("=== rule '$re' on $fi\n");
		if (! is_array($rule)) {
			$rule = [ $rule ];
		}
		$outf = null;
		foreach ($rule as $rule1) {
			if ($rule1 === "HASH") {
				logit("=== hash $fi\n");
				handleHash($fi, $outDir, $outf);
			}
			else if ($rule1 === "FAKE") {
				logit("=== fake $fi\n");
				handleFake($fi, $outDir);
			}
			else {
				logit("=== run cmd for $fi\n");
				$outf = $outDir . "/" . $fi;
				@mkdir(dirname($outf), 0777, true);
				putenv("TARGET={$outf}");
				// system($rule1);
				file_put_contents("tmp.sh", $rule1);
				passthru("sh tmp.sh");
			}
		}
		return;
	}
	global $g_isRebuild, $g_changedFiles;
	if (!$g_isRebuild) {
		if (array_search($fi, $g_changedFiles) === false)
			return false;
	}

	$noCopy = false;
	foreach ($COPY_EXCLUDE as $re) {
		if (matchRule($re, $fi)) {
			$noCopy = true;
			break;
		}
	}
	if ($noCopy)
		return false;
	if (! is_file($fi)) {
		print("!!! warning: missing file `$fi`.\n");
		return;
	}
	logit("=== copy $fi\n", 5);
	handleCopy($fi, $outDir);
}

// 直接改写输出参数 $opts
function readOpts($args, $knownOpts, &$opts)
{
	reset($args);
	for (; ($opt = current($args)) !== false; next($args)) {
		if ($opt[0] === '-') {
			$opt = substr($opt, 1);
			if (! in_array($opt, $knownOpts)) {
				die1("*** unknonw option `$opt`.\n");
			}

			$v = next($args);
			if ($v === false)
				die1("*** require value for option `$opt`\n");
			if ($v == 'yes' || $v == 'true')
				$v = true;
			else if ($v == 'no' || $v == 'false')
				$v = false;
			$opts[$opt] = $v;

			continue;
		}
		$opts["args"][] = $opt;
	}
	return $opts;
}

function fileHash($f)
{
	return substr(sha1_file($f), -6);
}
//}}}

// ====== main {{{

// ==== parse args {{{
if (count($argv) < 2) {
	echo("Usage: webcc {srcDir} [-o {outDir=output_web}]\n");
	echo("       webcc [-o {outFile}] -cmd {cmd} [args]\n");
	exit(1);
}

$prog = array_shift($argv);
addPath($prog);

readOpts($argv, $KNOWN_OPTS, $g_opts);
if (isset($g_opts['cmd'])) {
	WebccCmd::exec($g_opts['cmd'], $g_opts['args'], false);
	exit;
}

if (isset($g_opts['o']))
	$g_opts["outDir"] = $g_opts['o'];

$g_opts["srcDir"] = $g_opts['args'][0];

if (is_null($g_opts["srcDir"])) 
	die1("*** require param srcDir.");
if (! is_dir($g_opts["srcDir"]))
	die1("*** not a folder: `{$g_opts["srcDir"]}`\n");

// load config
$cfg = $g_opts["srcDir"] . "/" . CFG_FILE;
if (is_file($cfg)) {
	echo("=== load config `$cfg`\n");
	require($cfg);
}

$COPY_EXCLUDE[] = CFG_FILE;
//}}}

@mkdir($g_opts["outDir"], 0777, true);
$g_opts["outDir"] = realpath($g_opts["outDir"]);
$outDir = $g_opts["outDir"];
$verFile = "$outDir/revision.txt";
$oldVer = null;
if (file_exists($verFile)) {
	$oldVer = @file($verFile, FILE_IGNORE_NEW_LINES)[0];
}

chdir($g_opts["srcDir"]);
if ($g_useGit && isset($oldVer)) {
	$g_isRebuild = false;
	// NOTE: 仅限当前目录(srcDir)改动
	$cmd = "git diff $oldVer --name-only --diff-filter=AMR --relative";
	exec($cmd, $g_changedFiles, $rv);
	if (count($g_changedFiles) == 0)
		exit;
}
else {
	echo("!!! build all files !!!\n");
}

$allFiles = null;
$cmd = getenv("WEBCC_LS_CMD");
if ($cmd === false) {
	$cmd = "git ls-files";
	putenv("WEBCC_LS_CMD=$cmd");
}
else {
	$g_useGit = false;
}
exec($cmd, $allFiles, $rv);
if ($rv != 0) {
	die1("*** fail to exec `$cmd`.\n");
}

$updateVer = false;
foreach ($allFiles as $f) {
	if (is_dir($f))
		continue;
	if (handleOne($f, $outDir) !== false)
	{
		$updateVer = true;
	}
}

if ($g_useGit && $updateVer) {
	// update new version
	system("git log -1 --format=%H > $verFile");
}

echo("=== output to `$outDir`\n");
//}}}
// vim: set foldmethod=marker :
