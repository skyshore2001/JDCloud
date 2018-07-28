<?php
/**
@module create-wui-page.php

根据数据表名（即数据模型中的对象），生成管理端相应的列表页(wui-page)和详细页(wui-dialog)模板。
在server/web/page下有文件create-wui-page.sh，可在git-bash中直接运行，在该目录下创建文件。

	Usage: create-wui-page {obj} [title=obj] [baseObj=obj]

- obj: 文件名，一般与对象名相同。比如`Item`会生成`pageItem.html`等文件。

- title: 列表页或对话框标题。一般即中文描述。传"-"表示用默认。

- baseObj: 如果要为一个对象创建名称不同的文件，比如`Item`已创建过`商品管理`页，现在还想用同一个对象创建`商品结算`页（文件名称比如定为ItemST），则可以用

		create-wui-page ItemST 商品结算 Item

示例：

	create-wui-page Category 商品类别

*/

// 模板中可用这些变量：
$obj = null;
$baseObj = null;
$title = null;

@$obj = $argv[1];
if (! $obj) {
	echo "Usage: create-wui-page {obj} [title=obj] [baseObj=obj]\n";
	echo "   eg: create-wui-page Item\n";
	echo "   eg: create-wui-page Item 商品\n";
	exit;
}
if (!ctype_upper($obj[0])) {
	echo "Bad object format (uppercase first): $obj";
	exit;
}
$title = @$argv[2];
if ($title === "-" || $title === null)
	$title = "TODO-$obj"; // 要改成中文，所以加TODO
else if (PHP_OS == "WINNT") {
	@$a = iconv("gb18030","utf-8", $title);
	if ($a !== null)
		$title = $a;
}
$baseObj = @$argv[3] ?: $obj;

redirect("page$obj.html");
include("template/pageTpl.html");
redirect("page$obj.js");
include("template/pageTpl.js");
redirect("dlg$obj.html");
include("template/dlgTpl.html");
redirect("dlg$obj.js");
include("template/dlgTpl.js");
redirect(null);

foreach (["page$obj.html", "page$obj.js", "dlg$obj.html", "dlg$obj.js (optional)"] as $e) {
	echo "create $e\n";
}

global $fp;
function redirect($f)
{
	global $fp;
	if ($fp)  {
		@ob_end_flush();
		fclose($fp);
	}
	if (! isset($f))
		return;

	$fp = fopen($f, "w");
	ob_start(function ($buf) use ($fp){
		fwrite($fp, $buf);
	});
}

