<?php

/*
将同尺寸的多个小图标竖向拼合成一张大图片, 并生成相应的css描述文件.

1. 安装imagemagick软件, 确认命令行中可以运行convert等命令.

2. 开发时, 将图标按宽度分别置入相应文件夹中, 如 icon/16/xx.png, icon/24/xx.png, 然后创建css描述文件, 假如名为 icon-src.css, 例如:

	.icon-tree {
		background-image: url(icon/24/tree2.png);
	}
	.active .icon-tree {
		background-image: url(icon/24/tree.png);
	}
	.icon-back {
		background-image: url(icon/16/back.png);
	}
	.icon-menu {
		background-image: url(icon/16/menu.png);
	}

3. 使用本工具生成发布的css以及拼好的大图.
		
用法:

	php make_sprite.php icon-src.css icon.css

icon-src.css为前面一步创建的css图标描述文件. 
运行命令后, 生成 icon/24/sprite.png, icon/16/sprite.png, icon.css
 */

$info = []; // elem: dir=>{ width, height, @pics, y }
list($prog, $infile, $outfile) = $argv;
if (! isset($infile) || ! isset($outfile)) {
	die("make_sprite <src_css_file> <dst_css_file>");
}

$content = file($infile);
$fpout = fopen($outfile, "w");
chdir(dirname($infile));
foreach ($content as $ln) {
	if (! preg_match('/url\((.*?)\)/', $ln, $ms)) {
		fwrite($fpout, $ln);
		continue;
	}

	$picName = $ms[1];
	$dirName = dirname($ms[1]);
	if (! preg_match('/(\d+)$/', $dirName, $ms1)) {
		die("bad format for file: {$picName}.");
	}
	$width = $ms1[1];
	$height = $width; // TODO
	if (! array_key_exists($dirName, $info)) {
		$info[$dirName] = [
			"width" => $width,
			"y" => 0,
			"info" => [],
		];
	}
	$dir = &$info[$dirName];
	$dir["pics"][] = $picName;

	$outStr = "\tbackground-image: url({$dirName}/sprite.png);
\tbackground-size: {$width}px;
\tbackground-position-y: {$dir['y']}px;
";
	$dir["y"] -= $height;
	unset($dir);

	fwrite($fpout, $outStr);
}

fclose($fpout);
echo "=== generate css file: `{$outfile}'\n";
foreach ($info as $dirName => $dir) {
	$src = join(" ", $dir["pics"]);
	$dst = "{$dirName}/sprite.png";
	$cmd = "convert.exe {$src} -append ${dst}";
	#echo($cmd . "\n\n");
	system($cmd);
	echo "=== generate {$dst}\n";
}

