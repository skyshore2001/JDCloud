<?php
/**
@module create-wui-page.php

根据数据表名（即数据模型中的对象），生成管理端相应的列表页(wui-page)和详细页(wui-dialog)模板。
在server/web/page下有文件create-wui-page.sh，可在git-bash中直接运行，在该目录下创建文件。

	Usage: create-wui-page {name} [title] [baseObj=name]

- name: 文件名，一般与对象名相同。比如`Item`会生成`pageItem.html`等文件。如果指定了meta文件, 则可以指定为"-", 表示从meta中读取.

- title: 列表页或对话框标题。一般即中文描述。传"-"表示用默认。

- baseObj: 如果要为一个对象创建名称不同的文件，比如`Item`已创建过`商品管理`页，现在还想用同一个对象创建`商品结算`页（文件名称比如定为ItemST），则可以用

		create-wui-page ItemST 商品结算 Item

示例：

	create-wui-page Category 商品类别

如果当前目录下有meta.txt或以META环境变量指定了文件, 可读取该文件中的内容生成字段. 文件格式见meta-example.txt.
文件名与描述也可从meta中读取, 因而命令可简化为:

	./create-wui-page.sh -

支持同时生成相应的移动端页面:

	mui=1 ./create-wui-page.sh -

将多生成m2/page/vendor.html, m2/page/vendor.js用于添加和更新页面. (使用create-mui-page下的模板)
*/

// 模板中可用这些变量：
$obj = null;
$baseObj = null;
$title = null;
$meta = [
	// {name, type?=i/n, required?, linkTo?, enum?, isPic?, isAtt?}
	"id" => ["name"=>"编号", "type"=>"i"],
	"name" => ["name"=>"名称", "required"=>true]
];
/*
$meta = [
	"id" => ["name"=>"编号", "type"=>"i"],
	"name" => ["name"=>"名称", "required"=>true],
	"qty" => ["name"=>"数量", "required"=>true, "type"=>"n"],
	"customerId" => ["name"=>"客户", "linkTo"=>"Customer"],
	"status" => ["name"=>"状态", "enum"=>"OrderStatusMap"]
];
 */

@list ($prog, $obj, $title, $baseObj) = $argv;
if (! $obj) {
	echo "Usage: create-wui-page {name} [title=obj] [baseObj=obj]\n";
	echo "   eg: create-wui-page Item\n";
	echo "   eg: create-wui-page Item 商品\n";
	exit;
}
if ($title && PHP_OS == "WINNT") {
	@$a = iconv("gb18030","utf-8", $title);
	if ($a !== null)
		$title = $a;
}
$obj = ucfirst($obj);
loadMetafile();

if ($title === "-" || $title === null)
	$title = "TODO-$obj"; // 要改成中文，所以加TODO
if (!isset($baseObj))
	$baseObj = $obj;
else
	$baseObj = ucfirst($baseObj);

#echo "=== obj=$obj, title=$title, baseObj=$baseObj\n";

genFileWithTpl("page$obj.html", "template/pageTpl2.html");
genFileWithTpl("page$obj.js", "template/pageTpl.js");
genFileWithTpl("dlg$obj.html", "template/dlgTpl2.html");
genFileWithTpl("dlg$obj.js", "template/dlgTpl.js");

if (getenv("mui") !== false) {
	// 生成m2移动端文件
	$m2Dir = __DIR__ . "/../../server/m2/page";
	$m2TplDir = __DIR__ . "/../create-mui-page/template";
	$obj_bak = $obj;

	$obj = getListName($obj);
	$file = lcfirst($obj);
	genFileWithTpl("$m2Dir/$file.html", "$m2TplDir/list.html");
	genFileWithTpl("$m2Dir/$file.js", "$m2TplDir/list.js");
	$obj = $obj_bak;

	$file = lcfirst($obj);
	genFileWithTpl("$m2Dir/$file.html", "$m2TplDir/detail.html");
	genFileWithTpl("$m2Dir/$file.js", "$m2TplDir/detail.js");
}

function genFileWithTpl($f, $tpl)
{
	// 开放给模板的变量
	global $obj, $baseObj, $title, $meta;

	$fp = fopen($f, "w");
	ob_start(function ($buf) use ($fp){
		fwrite($fp, $buf);
	});
	include($tpl);
	@ob_end_flush();
	fclose($fp);
	$fp = null;
	echo("create $f\n");
}

function loadMetafile()
{
	$metafile = getenv("META");
	if (!$metafile) {
		$metafile = './meta.txt';
		if (!is_file($metafile))
			return false;
	}
	@$fp = fopen($metafile, "r");
	if (!$fp) {
		echo "*** cannot open metafile: $metafile\n";
		exit(1);
	}
	echo "=== load metafile: $metafile\n";
	$n = 0;
	$tableDef = null;
	$tableDscr = null;
	while(!feof($fp)) {
		$line = fgets($fp);
		if ($line[0] === "#" || ctype_space($line[0]) || !$line[0])
			continue;
		if ($n == 0) {
			$tableDef = readMetaLine($line);
		}
		else if ($n == 1) {
			$tableDscr = readMetaLine($line);
		}
		++ $n;
	}
	if (!$tableDef || !$tableDscr) {
		echo("*** bad metafile format: $metafile");
		exit(1);
	}
	if (count($tableDef["fields"]) != count($tableDscr["fields"])) {
		echo("*** bad metafile: field count mismatch");
		exit(1);
	}
	global $obj;
	global $baseObj;
	global $title;
	global $meta;
	$meta = [];

	if (!isset($obj) || $obj === "-") {
		$obj = $tableDef["table"];
	}
	$baseObj = $tableDef["table"];
	if (!isset($title))
		$title = $tableDscr["table"];

	// 字段定义："field/key1:value1"
	// 选项可以有多项："field/key1:value1/key2:value2" 中间不要出现空格
	$idx = 0;
	foreach ($tableDef["fields"] as $fieldName) {
		$fieldInfo = $tableDscr["fields"][$idx];
		@list($fieldDscr,$script) = explode('/', $fieldInfo, 2);
		$fieldMeta = [
			"name" => $fieldDscr
		];
		// guess type. e.g. price
		parseFieldType($fieldName, $fieldMeta);
		if ($script) {
			foreach (explode('/', $script) as $kvstr) {
				@list($k, $v) = explode(':', $kvstr);
				$fieldMeta[$k] = $v ?: true;
			}
		}

		$meta[$fieldName] = $fieldMeta;
		++$idx;
	}
}

// refer to: upglib.php parseFieldDef()
// set fieldMeta{type?, isPic?, isAtt?}
function parseFieldType(&$f, &$fieldMeta)
{
	$type = null;
	$f1 = ucfirst(preg_replace('/(\d|\W)*$/', '', $f)); // price0, unitPrice -> Price
	if (preg_match('/(@|&|#)$/', $f, $ms)) {
		$f = substr_replace($f, "", -1);
		if ($ms[1] == '&') {
			$type = 'i';
		}
		else {
			$type = 'n';
		}
	}
	elseif (preg_match('/\((\w+)\)$/u', $f, $ms)) {
		$tag = $ms[1];
		$f = preg_replace('/\((\w+)\)$/u', '', $f);
		if ($tag == 'm' || $tag == 'l') {
			$type = 's';
		}
		elseif (is_numeric($tag)) {
			if ($tag <= 255)
				$type = 's';
			else
				$type = 't'; // 长文本当成text
		}
		else {
			$type = $tag;
		}
	}
	elseif (preg_match('/(Price|Qty|Total|Amount)$/', $f1)) {
		$type = 'n';
	}
	elseif (preg_match('/Id$/', $f1)) {
		$type = 'i';
	}

	if ($type) {
		$fieldMeta["type"] = $type;
	}

	if (preg_match('/(PicId|Pics)$/', $f1)) {
		$fieldMeta["isPic"] = true;
		$fieldMeta["isAtt"] = true;
	}
	else if (preg_match('/(AttId|Atts)$/', $f1)) {
		$fieldMeta["isAtt"] = true;
	}
}

// return: {table, @fields}
function readMetaLine($line)
{
	if (!preg_match('/@?([\w_]+)[:：]\s*(.+?)\s*$/u', $line, $ms)) {
		echo("bad metafile line: $line");
		exit(1);
	}
	return [
		"table" => $ms[1],
		"fields" => preg_split('/\s*[,，]\s*/u', $ms[2])
	];
}

function getListName($s)
{
	if (substr($s, -1) == "s")
		return $s . "List";
	return $s . "s";
}
