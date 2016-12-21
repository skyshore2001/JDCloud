<?php
/**
@module jdcloud-gendoc

代码内文档生成器。

对以下关键字会生成标题(同时也生成链接): @fn, @var, @module, @class

对以下关键字会生成锚点（被链接对象）：@alias, @key, @event

使用@see可以引用这些对象。特别的，@see后面可连用多个以","分隔的关键字，如 @see param,mparam 。

用法：

	php jdcloud-gendoc.php mysrc.js -title "API-Reference" > doc.html

文档于utf-8编码，引用css文件style.css。该文件可自行配置。

*/

require("lib/common.php");
require("lib/Parsedown.php");

// ====== config
$defaultOptions = [
	"title" => "API文档",
	"subtoc" => 1,
];

// ====== global
$keys = []; # elem:{type, name, ns/namespace}
$newBlock = false;
$blocks = [];
$options = null; # {title, encoding}

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

		global $newBlock, $keys, $curBlockId;
		$class = $ms[1];
		$key = $ms[2];
		$other = $ms[3] ?: "";

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
$options = mygetopt(['title:', 'encoding:'], $argv1) + $defaultOptions;
if (count($argv1) == 0) {
	usage();
	return 1;
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

$docDate = date('Y-m-d');
echo <<<EOL
<html>
<head>
<meta charset="utf-8">
<title>{$options['title']}</title>
<style>
h3,h4,h5,h6 {
	font-size: 1em;
}

pre {
	border-left: 1px solid #ccc;
	margin: 0 1em;
	padding: 0 0.5em;
	tab-size:4;
}

code {
	font-family: "Courier New";
    padding: 0px 3px;
    display: inline-block;
}

.toc {
	margin: 2em;
}

.toc p {
	margin: 0.3em 0;
}

</style>
<link rel="stylesheet" href="style.css" />
</head>

<h1>{$options['title']}</h1>
<div>最后更新：$docDate</div>

EOL;

# ---------- module list
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

# ---------- keyword list
usort($keys, function ($a, $b) {
	return strcmp($a['name'], $b['name']);
});
echo "<h2>Keywords</h2>\n";
echo "<div class=\"toc\">\n";
foreach ($keys as $key) {
	outputOneKey($key);
}
echo "</div><hr>\n";

# ----------- blocks
foreach ($blocks as $s) {
	echo $s;
	echo "<hr>\n";
}

# ------- end tag
echo "<div style=\"text-align:center\">Generated by jdcloud-gendoc @ " . date('c') . "</div>\n";
echo "</html>";
