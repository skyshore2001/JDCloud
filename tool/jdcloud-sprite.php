<?php
/**

@module jdcloud-sprite

精灵图(sprite)生成工具。

将多个小图标竖向拼合成一张大图片, 并生成相应的css描述文件.
使用竖向拼合可减少图片大小。一般建议将相同宽度的图片一起生成竖图，效率更高。

1. 安装imagemagick软件, 确认命令行中可以运行convert等命令.

2. 开发时, 创建css描述文件, 假如名为 icon.css:

		/ * 24x24 @2x图 * /
		.icon-tree {
			background-image: url(icon/24/tree2.png);
		}
		.active .icon-tree {
			background-image: url(icon/24/tree.png);
		}

		/ * 16x16 @2x图 * /
		.icon-back {
			background-image: url(icon/16/back.png);
		}
		.icon-menu {
			background-image: url(icon/16/menu.png);
		}

	注意：

	- 工具将扫描 "background: url(...);" 这些关键点，处理完图片后，就会替换这些地方并输出。在语法格式上没有特殊要求，它可以在单独一行中，也可以和别的行混杂在一起。
	- 不要将1x图片与2x图片定义在一个css文件中。工具处理时，将该文件中所有图片当作1x或2x等处理（默认1x, 可通过参数-2x指定生成@2x图片）

3. 使用本工具生成新的sprite图（拼合后的大图）以及相应的css文件
		
用法:

	php jdcloud-sprite.php icon.css

它在icon.css相同目录下生成 icon.out.css文件以 icon.png 图.
一般建议按不同宽度的图分组生成多个sprite，可以加参数 -group 支持按指定宽度分组，这样宽度为16px（如果是@2x图，实际宽度是32）的图拼合到 icon-16.png中, 宽度为24px的图拼合到icon.24.png中, 等等。

	php jdcloud-sprite.php icon.css -group

若要控制生成的文件名，可以用-out, -sprite等参数：

	php jdcloud-sprite.php icon.css -2x -out icon/icon@2x.css -sprite icon@2x.png

运行命令后, 生成 icon/icon@2x.png, icon@2x.css; 如果加-group参数，则生成的图片文件名为 icon/icon@2x-16.png等。

参数表：

	php jdcloud-sprite.php {icon}.css [-group] [-2x] [-o {icon}.out.css] [-sprite {icon}.png]

注意：

- 生成图片的顺序是按照输入Css中指定的顺序。因此要加入新图片，最好加到同宽度图片的最后，这样生成图片及css的改动最小。

 */

require("lib/common.php");

// ====== global {{{
$infile = null;
$outfile = null;
$options = null;

$inputInfo = []; // elem: width => {x, y, @pics}; pic={file, width, height, x, y}

$picArr = [];  // elem=pic

$maxWidth = 0;
// }}}

// ====== parse args {{{

$options = mygetopt(["2x", "group", "out:", "sprite:", "ratio:"], $argv1);

@$infile = $argv1[0] or die1("*** require {src-css-file}\n");

if (! isset($options["out"])) {
	$options["out"] = str_replace(".css", ".out.css", $infile);
}
if (! isset($options["sprite"])) {
	$options["sprite"] = basename($infile, ".css") . ".png";
}
if (! isset($options["ratio"])) {
	if (@$options["2x"])
		$options["ratio"] = 2;
	else
		$options["ratio"] = 1;
}
else {
	$options["ratio"] = (int)$options["ratio"] ?: 1;
}

if (!isset($options["group"])) {
	$options["group"] = false;
}
// }}}

// ====== functions {{{
// 注意：die返回0，请调用die1返回1标识出错。
function die1($msg)
{
	fwrite(STDERR, $msg);
	exit(1);
}

// return: {width, height}
function getImageInfo($file)
{
	// e.g "add.png PNG 32x32 32x32+0+0 8-bit sRGB 200B 0.000u 0:00.000"
	$cmd = "identify \"$file\"";
	$info = system($cmd, $rv); // NOTE: use exec to disable msg
	if ($rv != 0) {
		die1("*** fail to get image info: `{$file}' - {$info}\n");
	}
	if (! preg_match('/(\d+)x(\d+)/', $info, $ms)) {
		die1("*** unknown image info: {$info}\n");
	}
	$ret = [
		"width" => (int)$ms[0],
		"height" => (int)$ms[1]
	];
	return $ret;
}

function getSpriteFilename($width)
{
	global $options;
	$dst = $options["sprite"];
	if ($width > 0) {
		$dst = str_replace(".png", "-{$width}.png", $dst);
	}
	return $dst;
}

function handleOne($picName)
{
	global $options;
	global $inputInfo;
	global $picArr;
	global $maxWidth;

	$imgInfo = getImageInfo($picName);
	$ratio = $options["ratio"];
	$w = $imgInfo["width"] / $ratio;
	$h = $imgInfo["height"] / $ratio;

	// 按宽度分组
	$key = null;
	if ($options["group"]) {
		$key = $w;
	}
	else {
		$key = 0;
		if ($maxWidth < $w)
			$maxWidth = $w;
	}
	if (!is_integer($key)) {
		die1("*** bad @{$ratio}x image `$picName`: width={$imgInfo['width']}/$ratio=$key.\n");
	}
	if (! array_key_exists($key, $inputInfo)) {
		$inputInfo[$key] = [
			"x" => 0,
			"y" => 0,
			"pics" => [],
		];
	}
	$e = &$inputInfo[$key];
	$pic = [
		"file" => $picName,
		"width" => $w,
		"height" => $h,
		"x" => $e["x"],
		"y" => $e["y"]
	];
	$e["pics"][] = $pic;
	$picArr[] = $pic;

	$e["x"] -= $w;
	$e["y"] -= $h;
	unset($e);
}

// }}}

// ====== main 
//var_dump($options);

@$content = file_get_contents($infile) or die1("*** cannot open infile: `$infile'\n");
@$fpout = fopen($options["out"], "w") or die1("*** cannot open out file: `{$options['out']}'\n");
chdir(dirname($infile));

// 第一遍扫描，去除注释，扫描图片并以 "{{n}}" 标记，下次扫描时将填上正确内容。
$content = preg_replace_callback('/ \/\* (.|\n)*? \*\/\s* |
	background.*? url\([ \'"]*(.*?)[ \'"]*\).*?;
/x', function ($ms) {
	if ($ms[1]) 
		return "";

	global $picArr;
	$n = count($picArr);
	handleOne($ms[2]);
	return '{{' . $n . '}}';
}, $content);

// generate sprite: icon.png, icon-16.png, etc.
foreach ($inputInfo as $w => $e) {
	$src = "";
	foreach ($e["pics"] as $pic) {
		$src .= $pic["file"] . " ";
	}
	$dst = getSpriteFilename($w);
	$cmd = "convert {$src} -append ${dst}";
	#echo($cmd . "\n\n");
	$lines = null;
	$info = exec($cmd, $lines, $rv);
	if ($rv != 0) {
		die1("fail to generate sprite: {$info}\n");
	}
	echo "=== generate {$dst}\n";
}

// generate icon.out.css
$content = preg_replace_callback('/{{(\d+)}}/', function ($ms) {
	global $picArr;
	global $maxWidth;
	global $options;
	$pic = $picArr[$ms[1]];

	if ($options["group"]) {
		$w = $pic["width"];
		$sprite = getSpriteFilename($w);
	}
	else {
		$w = $maxWidth;
		$sprite = getSpriteFilename(0);
	}
	$outStr = "background-image: url({$sprite}); background-size: {$w}px !important; background-position: 0 {$pic['y']}px !important;";
	return $outStr;
}, $content);

fwrite($fpout, $content);
fwrite($fpout, "/* generated by jdcloud-sprite @ " . date('c') . " */");
fclose($fpout);
echo "=== generate css file: `{$options['out']}'\n";

// vi: foldmethod=marker
