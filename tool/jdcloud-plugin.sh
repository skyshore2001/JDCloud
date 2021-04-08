#!/bin/sh
:<<'*/'
/**
@module jdcloud-plugin

筋斗云插件安装、卸载工具。

用法：须在项目目录下调用，假设项目目录为myproject, 插件为jdcloud-plugin-notify. 两个目录必须都使用git管理。

	# 用git下载插件，注意与项目目录平级
	git clone server-pc:src/jdcloud-plugin-notify
	cd myproject

	# 安装
	./tool/jdcloud-plugin add ../jdcloud-plugin-notify

	# 删除
	./tool/jdcloud-plugin del jdcloud-plugin-notify
	也可以用
	./tool/jdcloud-plugin del ../jdcloud-plugin-notify

插件的目录结构与项目目录一致。

安装时，将插件目录下的文件复制到项目相应目录下，或对于项目中已有的文件，则会将内容合并到相应文件中，然后将安装信息写入plugin.dat文件中，并将相关文件均添加到git。
删除插件时，根据plugin.dat中的相应数据，删除文件或删除共享文件中插件的内容。
目前不支持直接更新插件，可先删除再安装。

特别地，插件下的README.md文件将被复制到项目下的路径`server/plugin/{插件名}.README.md`。

plugin.dat格式如下：

	{pluginName}	#{git版本}
	{pluginName}	{newFile}
	{pluginName}	+{appendfile}

版本行只用于记录版本，无处理逻辑。标记为+的文件在删除插件时，会自动将追加的内容删除掉，而不是删除整个文件。

## 创建插件

假如要创建名为jdcloud-plugin-url的插件，须先在plugin.dat中注册插件需要的所有文件，如：

	jdcloud-plugin-url	#init
	jdcloud-plugin-url	server/url.php
	jdcloud-plugin-url	+server/plugin/index.php

其中第1行表示插件名；第2行表示将指定文件添加到插件；第3行中，文件名前有加号，表示只需要该文件将特定标识内的内容添加到插件。

特定标识为`{插件名} BEGIN`和`{插件名} END`，其中的内容即为插件内容，特定标识一般包在注释内，示例：

	/*! jdcloud-plugin-url BEGIN */
	function api_getShareUrl()
	{
		...
	}
	/*! jdcloud-plugin-url END */

创建一个说明文件，路径为`server/plugin/{插件名}.README.md`。这里创建`server/plugin/jdcloud-plugin-url.README.md`。
该文件将对应插件目录下的README.md文件。

接下来，创建独立的插件目录和代码库，它与项目平级：

	git init jdcloud-plugin-url

然后回到项目目录，调用命令，根据plugin.dat的内容创建插件到指定路径：

	./tool/jdcloud-plugin create ../jdcloud-plugin-url

然后进入插件目录，提交文件到git库即可。

若要更新插件，也是相同步骤：更新plugin.dat，调用`jdcloud-plugin create`命令，提交文件到插件git库。
*/
### global
pluginName=

### main

# (srcFile, dstDir)
# 返回1表示append, 0表示add
function addOne() {
	if [[ ! -f $2/$1 ]]; then
		echo "add $1"
		cp --parents $1 $2
	else
		echo "append $1"
		dstFile=$2/$1

		if [[ $1 == *.html || $1 == *.md ]]; then
			tag1="<!-- "
			tag2=" -->"
		else
			tag1="/*! "
			tag2=" */"
		fi
		echo >> $dstFile
		echo "$tag1 $pluginName BEGIN $tag2" >> $dstFile
		cat $1 >> $dstFile
		echo "$tag1 $pluginName END $tag2" >> $dstFile
		return 1
	fi
}

# (srcFile)
function delOne() {
	srcFile=$1
	doStrip=0
	# 以+开头
	if [[ $srcFile == +* ]]; then
		srcFile=${srcFile:1}
		doStrip=1
	fi
	[[ ! -f $srcFile ]] && return

	if [[ $doStrip -eq 1 ]] ; then
		echo "strip $srcFile"
		sed -i "/$pluginName BEGIN/,/$pluginName END/d" $srcFile
	else 
		echo "del $srcFile"
		rm -f $srcFile
	fi
}

# (srcFile)
function createOne() {
	srcFile=$1
	dstDir=$2
	doStrip=0
	# 以+开头
	if [[ $srcFile == +* ]]; then
		srcFile=${srcFile:1}
		doStrip=1
	fi
	[[ ! -f $srcFile ]] && return

	echo "create $srcFile"
	cp --parents $srcFile $dstDir
	if [[ $doStrip -eq 1 ]] ; then
		sed -n "/$pluginName BEGIN/,/$pluginName END/p" $srcFile | sed "1d;\$d" > $dstDir/$srcFile
	fi
}

ac=$1
path=$2

if [[ -z $ac || -z $path ]]; then
	echo "Usage: ./tool/jdcloud-plugin.sh {add|del|create} <plugin-path>"
	echo "   eg: ./tool/jdcloud-plugin.sh add ../jdcloud-plugin-mail"
	exit 1
fi
pluginName=`basename $path`
readme=server/plugin/$pluginName.README.md

if [[ $ac == "add" ]]; then
	if [[ ! -d $path ]]; then
		echo "*** bad dir $path"
		exit 2
	fi
	if grep "^$pluginName	" plugin.dat &>/dev/null ; then
		echo "*** $pluginName has added to project."
		exit 3
	fi
	# 注意: add操作是在srcDir中做的
	# pushd $path | read a dstDir
	tmp=`mktemp`; pushd $path > $tmp ; read a dstDir < $tmp
	files=`git ls-files | grep -v "^README.md"`
	pluginInfo=$dstDir/plugin.dat
	ver=`git log -1 --format=%H`
	echo "$pluginName	#$ver" >> $pluginInfo
	for srcFile in $files; do
		addOne $srcFile $dstDir
		if [[ $? -eq 0 ]]; then
			echo "$pluginName	$srcFile" >> $pluginInfo
		else
			echo "$pluginName	+$srcFile" >> $pluginInfo
		fi
	done
	if [ -f "README.md" ]; then
		cp README.md "$dstDir/$readme"
	fi
	popd >/dev/null
	git add $files plugin.dat
	if [ -f $readme ]; then
		git add $readme
	fi
	rm $tmp

elif [[ $ac == "del" ]]; then
	if [[ ! -f plugin.dat ]]; then
		echo "*** $pluginName is *NOT* installed"
		exit 1
	fi
	files=$(sed -n "/^$pluginName	/p" plugin.dat | awk '{print $2}' | sed '/#/d')
	for srcFile in $files; do
		delOne $srcFile
	done
	sed -i "/^$pluginName	/d" plugin.dat
	rm -f $readme
	# 注意去除files中的+号
	git add ${files//+/} plugin.dat
elif [[ $ac == "create" ]]; then
	if [[ ! -f plugin.dat ]]; then
		echo "*** cannot find $pluginName in plugin.dat"
		exit 1
	fi
	files=$(sed -n "/^$pluginName	/p" plugin.dat | awk '{print $2}' | sed '/#/d')
	mkdir -p $path 2>/dev/null
	echo "=== copy files to $path..."
	for srcFile in $files; do
		createOne $srcFile $path
	done
	cp $readme $path/README.md 2>/dev/null
else
	echo "*** error: unknown action $ac"
	exit 1
fi
# vi: foldmethod=marker
