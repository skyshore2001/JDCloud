<?php
/**
@module jdcloud-gendoc

代码内文档生成器。

对以下关键字会生成标题(同时也生成链接): @fn, @var, @module, @class

对以下关键字会生成锚点（被链接对象）：@alias, @key, @event

使用@see可以引用这些对象。特别的，@see后面可连用多个以","分隔的关键字，如 @see param,mparam 。

用法：

	php jdcloud-gendoc.php mysrc.js -title "API-Reference" > doc.html

文档使用utf-8编码。输出模板默认为refdoc-template.php，其中引用css文件style.css。
如果要指定模板，可以用`-template`参数。

	php jdcloud-gendoc.php mysrc.js -title "API-Reference" -template refdoc-template-jdcloud.php > doc.html

*/

require("lib/common.php");
require("lib/Parsedown.php");

// ====== config
$defaultOptions = [
	"subtoc" => 1,
	"template" => __DIR__ . "/refdoc-template.php",
];

// ====== global
$keys = []; # elem:{type, name, ns/namespace}
$newBlock = false;
$blocks = [];
$options = null; # {title, encoding}
$autoTitle = null;

$titleStack = []; # elem: [num, level]

// for sub-toc
$curBlockId = null;
$subTitles = [];

// ====== function
// 注意：die返回0，请调用die1返回1标识出错。
function die1($msg)
{
	fwrite(STDERR, $msg);
	exit(1);
}

// key={type,name}
function makeKeyword($key)
{
	$ns = 'Global';
	if (preg_match('/^(.*)\.(.*)$/', $key['name'], $ms)) {
		$ns = $ms[1];
	}
	else {
	}
	$key['ns'] = $ns;
	return $key;
}

// REFER TO: https://github.com/erusev/parsedown/wiki/Tutorial:-Create-Extensions
class MyParsedown extends Parsedown
{
	function __construct() {
		$this->BlockTypes['@'][] = 'FormatText';
		//$this->inlineMarkerList .= '@';
		$this->breaksEnabled = true;
	}

	protected function blockFormatText($Line)
	{
		$text = $Line['text'];
		if (! preg_match('/@(\w+)\s+([^(){}? ]+)(.*)/', $text, $ms) )
			return;

		global $newBlock, $keys, $curBlockId, $autoTitle;
		$class = $ms[1];
		$key = $ms[2];
		$other = $ms[3] ?: "";

		// 第一个module作为默认标题
		if ($class == 'module' && !isset($autoTitle)) {
			$autoTitle = $key . $other;
		}
		if ($newBlock) {
			global $titleStack;
			$titleStack = [];
			$newBlock = false;
			$keys[] = makeKeyword(["name"=>$key, "type"=>$class]);
			$markup = "<h2 id=\"{$key}\">" . $ms[0] . "</h2>"; // remove '@'
			$curBlockId = $key;
		}
		else {
			if ($class == "see") {
				// @see param
				// @see param,mparam
				$ks = explode(',', $key);
				$key = '';
				foreach ($ks as $k) {
					if (strlen($key) >0)
						$key .= " ";
					$key .= "<a href=\"#{$k}\">{$k}</a>";
				}
			}
			else if ($class == "alias" || $class == "key" || $class == "event" || $class == "fn" || $class == "var") {
				$keys[] = makeKeyword(["name"=>$key, "type"=>$class]);
				$key = "<a id=\"{$key}\">{$key}</a>";
			}
			$markup = "<p class=\"{$class}\"><strong>@{$class} {$key}</strong> {$other}</p>";
		}
		$Block = [
			"markup" => $markup
		];
		return $Block;
	}

	private function getTitleNum($level)
	{
		global $titleStack;
		$titleNum = "1";
		while (! empty($titleStack)) {
			// titleStack: item=[num, level]
			$item = &$titleStack[count($titleStack)-1];
			if ($level > $item[1]) {
				$titleNum = $item[0] . '.1';
				$titleStack[] = [ $titleNum, $level ];
				break;
			}
			else if ($level == $item[1]) {
				$titleNum = preg_replace_callback('/(\d+)$/', function ($ms) {
					return (int)$ms[1] +1;
				}, $item[0]);
				$item[0] = $titleNum;
				break;
			}
			else {
				array_pop($titleStack);
			}
			unset($item);
		}
		unset($item);
		if (empty($titleStack)) {
			$titleStack[] = [ $titleNum, $level ];
		}
		return $titleNum;
	}

    protected function blockHeader($Line)
	{
		$e = parent::blockHeader($Line);
		$text = $e['element']['name'];
		// 注释中的标题降两级，并添加题标数
		if (preg_match('/h(\d+)/', $text, $ms)) {
			$level = (int)$ms[1];
			$titleNum = $this->getTitleNum($level);

			$elem = &$e['element'];
			$elem['name'] = "h" . ($level + 2);
			$txt = $titleNum . " " . $elem['text'];
			$elem['text'] = $txt;

			global $options;
			if ($options['subtoc']) {
				if (! isset($elem['attributes'])) {
					$elem['attributes'] = [];
				}
				global $curBlockId, $subTitles;
				$elem['attributes']['id'] = subTocId($curBlockId, $txt);
				$subTitles[] = $txt;
			}
		}
		return $e;
	}
}

function handleOptionEncoding()
{
	global $options;
	if (@$options['encoding']) {
		foreach (['title'] as $prop) {
			$options[$prop] = iconv($options['encoding'], 'utf-8', $options[$prop]);
		}
	}
}

function outputOneKey($key)
{
	echo "<p><a href=\"#{$key['name']}\">{$key['name']} ({$key['type']})</a></p>\n";
}

function subTocId($blockId, $tocId)
{
	return "{$blockId}-{$tocId}";
}

function handleSubToc($txt)
{
	global $curBlockId, $subTitles;
	$ts = '<div class="toc">';
	foreach ($subTitles as $t) {
		$href = subTocId($curBlockId, $t);

		// calc level
		$level = 0;
		$len = strlen($t);
		for ($i=0; $i<$len; ++$i) {
			if ($t[$i] == '.') {
				++ $level;
			}
			else if ($t[$i] == ' ') {
				break;
			}
		}

		$level *= 2;
		$ts .= "<p style=\"margin-left:{$level}em\"><a href=\"#{$href}\">{$t}</a></p>\n";
	}
	$ts .= '</div>';
	// NOTE: 在<h2>标签之后添加Toc
	return preg_replace('/<\/h2>\K/', $ts, $txt, 1); // replace once.
}

function usage()
{
	echo 'Usage:
  jdcloud-gendoc {source_file} -title {title} > {output_html}

Example:
  php jdcloud-gendoc.php mysrc.js -title "API-Reference" > doc.html
';
}
// ====== main

$argv1 = null;
$options = mygetopt(['title:', 'encoding:', 'template:'], $argv1) + $defaultOptions;
if (count($argv1) == 0) {
	usage();
	return 1;
}
if (! is_file($options["template"])) {
	die1("cannot open template file: `{$options['template']}'");
}

handleOptionEncoding();
foreach ($argv1 as $f) {
	@$str = file_get_contents($f) or die1("*** require input file.\n");
	$pd = new MyParsedown();

	preg_replace_callback('/
		\/\*\*+\s* (@\w+ \s+ .*?) \s*\*+\/
	/xs', function ($ms) {

		global $newBlock, $pd, $blocks, $options, $subTitles;
		$newBlock = true;
		$subTitles = [];
		$txt = $pd->text($ms[1]);
		if ($options['subtoc'] && count($subTitles) > 0) {
			$txt = handleSubToc($txt);
		}
		$blocks[] = $txt;

	}, $str);
}
if (!isset($options['title'])) {
	$options['title'] = $autoTitle ?: '参考手册';
}

class Doc
{
	static $title;
	static $docDate;

# ---------- module list
	static function outputModules()
	{
		global $keys;
		$first = true;
		foreach ($keys as $key) {
			if ($key['type'] == 'module') {
				if ($first) {
					$first = false;
					echo "<h2>Modules</h2>\n";
					echo "<div class=\"toc\">\n";
				}
				outputOneKey($key);
			}
		}
		if ($first == false) {
			echo "</div><hr>\n";
		}
	}

# ---------- keyword list
	static function outputKeys()
	{
		global $keys;
		usort($keys, function ($a, $b) {
			return strcmp($a['name'], $b['name']);
		});
		echo "<h2>Keywords</h2>\n";
		echo "<div class=\"toc\">\n";
		foreach ($keys as $key) {
			outputOneKey($key);
		}
		echo "</div><hr>\n";
	}

# ----------- blocks
	static function outputBlocks()
	{
		global $blocks;
		foreach ($blocks as $s) {
			echo "<div class=\"block\">\n";
			echo $s;
			echo "</div>\n";
		}
	}
}

Doc::$title = $options['title'];
Doc::$docDate = date('Y-m-d');

require($options["template"]);
