<?php
/**
@module create-mui-page.php

根据模板生成相应的逻辑页
在server/m2/page下有文件create-mui-page.sh，可在git-bash中直接运行，在该目录下创建文件。

	Usage: create-mui-page {name} {title} {template=simple|order|orders} [baseObj=name]

- name: 文件名，一般与对象名相同。比如`Item`会生成`item.html`等文件及`initPageItem`函数。

- title: 页面标题。一般为中文描述。传"-"表示先用TODO填充之后再修改。

- templateFile: 模板名。

- baseObj: 基础对象名称。如果省略，则与name相同。

示例：

	create-mui-page Item 商品明细 order
	create-mui-page Items 商品列表 orders Item

*/

@list ($prog, $obj, $title, $tpl, $baseObj) = $argv;
if (! $obj || ! $title || !$tpl) {
	echo "Usage: create-mui-page {name} {title} {template=simple|order|orders} [baseObj=name]\n";
	echo "   eg: create-mui-page Item 商品明细 order\n";
	echo "   eg: create-mui-page Items 商品列表 orders Item\n";
	exit;
}
if (!ctype_upper($obj[0])) {
	echo "Bad object format (uppercase first): $obj";
	exit;
}
if ($title === "-" || $title === null)
	$title = "TODO-$obj"; // 要改成中文，所以加TODO
else if (PHP_OS == "WINNT") {
	@$a = iconv("gb18030","utf-8", $title);
	if ($a !== null)
		$title = $a;
}

if (! file_exists(__DIR__ . "/template/$tpl.html")) {
	echo "*** no template `$tpl'\n";
	exit;
}

if (!isset($baseObj))
	$baseObj = $obj;
$file = lcfirst($obj);

genFile("$file.html", "template/$tpl.html");
genFile("$file.js", "template/$tpl.js");

foreach (["$file.html", "$file.js"] as $e) {
	echo "create $e\n";
}

function genFile($f, $tpl)
{
// 模板中可用这些变量：
global $obj,$title,$baseObj,$file;
	redirect($f);
	include($tpl);
	redirect(null);
}

global $fp;
function redirect($f)
{
	global $fp;
	if ($fp)  {
		@ob_end_flush();
		fclose($fp);
		$fp = null;
	}
	if (! isset($f))
		return;

	$fp = fopen($f, "w");
	ob_start(function ($buf) use ($fp){
		fwrite($fp, $buf);
	});
}

