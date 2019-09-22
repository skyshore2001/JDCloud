#!/bin/sh
# 将css和js文件合并压缩达到页面加载优化效果。
# 用法: MERGE=lib mergeJsCss.sh a.js a.css b.min.js b.min.css
# 用MERGE环境变量指定生成的文件。默认即是MREGE=lib, 生成lib.min.css, lib.min.js以及用于源码调试的lib.html
# 在HTML中引入：
#	<!--link rel="import" href="lib.html" /-->
#	<link rel="stylesheet" href="lib.min.css" />
#	<script src="lib.min.js"></script>
# 发布版使用合并压缩版本；在需要调试源码时，打开注释使用lib.html，注释掉下面两行。

dir=`dirname $0`
jsmin=$dir/jsmin
cssmin=$dir/cssmin
if [[ -n WINDIR ]]; then
	jsmin=${jsmin}.exe
	cssmin=${cssmin}.exe
fi

if [[ -z MERGE ]]; then
	MERGE=lib
fi
CSS=$MERGE.min.css
JS=$MERGE.min.js
HTML=$MERGE.html

rm -f $CSS $JS $HTML 2>/dev/null

for f in $*; do
	if [[ $f == *.css ]]; then
		echo "/* merge css: $f */" >> $CSS
		if [[ $f == *[.-]min.css ]]; then
			cat $f >> $CSS
		else
			$cssmin < $f >> $CSS
		fi
		echo >> $CSS
		echo "<link rel=\"stylesheet\" href=\"$f\" />" >> $HTML
	elif [[ $f == *.js ]]; then
		echo "// merge js: $f" >> $JS
		if [[ $f == *[.-]min.js ]]; then
			cat $f >> $JS
		else
			$jsmin < $f >> $JS
		fi
		echo >> $JS
		echo "<script src=\"$f\"></script>" >> $HTML
	fi
done
echo === generate $JS,$CSS,$HTML

