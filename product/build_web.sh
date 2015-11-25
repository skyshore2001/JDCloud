#!/bin/sh
OUT_DIR=../xeyc-sys-online

if [[ ! -d $OUT_DIR ]]; then
	echo "*** 文件夹不存在：$OUT_DIR"
	exit
fi

# e.g. "dir1\dir2\name" => "dir1/dir2/name" on windows.
f=${0//\\/\/}
script=`pwd`/`basename $f`

php tool/webcc.php server -o $OUT_DIR

lastlog=`git log -1 --oneline | tr \" \'`
echo "=== 最后日志: $lastlog"

cd $OUT_DIR

change=`git status -s`
if [[ -z $change ]]; then
	echo "=== 没有文件变动!"
	exit
fi

echo
echo "=== 检查到以下文件变动："
git status -s

echo
read -p '=== 确认改动? (y/n) ' a
if [[ $a != 'y' && $a != 'Y' ]]; then
	exit
fi

git add .
git status -s

echo
read -p '=== 上传到服务器? (y/n) ' a
if [[ $a != 'y' && $a != 'Y' ]]; then
	exit
fi

cmd=`git status -s 2>/dev/null | awk '{print $2}' | perl -x $script getcmd`
if [[ -z $cmd ]]; then exit ; fi

if $cmd; then
	echo "=== 上传成功!"
else
	echo "!!! 出错了(返回值为$0), 请检查!!!"
fi

git commit -m "$lastlog"

echo
read -p '=== 推送到代码库? (y/n) ' a
if [[ $a != 'y' && $a != 'Y' ]]; then
	exit
fi
git push origin

exit
################# perl cmd {{{
#!perl

use File::Basename;
if ($ARGV[0] eq 'getcmd')
{
	%files = (); # dir=>name
	while (<STDIN>) {
		chomp;
		$dir = dirname($_);
		$files{$dir} = [] if !exists($files{$dir});
		push @{$files{$dir}}, $_;
	}

	while (my ($dir, $fs) = each(%files)) {
		if ($dir eq ".") {
			$dir = "";
		}
		else {
			$dir .= "/";
		}
		$cmd .= " -T {" . join(',', @$fs) . "} ftp://oliveche.com/default/cheguanjia/$dir";
	}

	exit unless defined $cmd;
	print "curl -s -S --ftp-create-dirs -u www:ywtl_TPGJ $cmd";
}
#}}}
# vim: set foldmethod=marker :
