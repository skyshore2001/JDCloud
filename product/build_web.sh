#!/bin/sh
OUT_DIR=../product-online
export URL=ftp://oliveche.com/default/jdy/
if [[ -z FTP_AUTH ]]; then
	export FTP_AUTH=www:hello
fi

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
doUpload=1
if [[ $a != 'y' && $a != 'Y' ]]; then
	doUpload=0
fi

if [[ $doUpload != 0 ]]; then
	cmd=`git status -s 2>/dev/null | perl -x $script getcmd`
	if [[ -z $cmd ]]; then exit ; fi

	#echo $cmd > cmd1.log
	if $cmd; then
		echo "=== 上传成功!"
	else
		echo "!!! 出错了(返回值为$?), 请检查!!!"
		exit
	fi
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
		s/^..\s+//; # e.g. git status -b: "A  m/images/ui/icon-svcid-1.png"
		s/.+?->\s+//; # e.g. "R  web/js/app.js -> web/js/app_fw.js"
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
		$cmd .= " -T {" . join(',', @$fs) . "} $ENV{URL}/$dir";
	}

	exit unless defined $cmd;
	# TODO: change your user/pwd
	$fullCmd = "curl -s -S --ftp-create-dirs -u $ENV{FTP_AUTH} $cmd";
	print $fullCmd;
	#open O, ">cmd.log";
	#print O $fullCmd;
	#close O;
}
#}}}
# vim: set foldmethod=marker :
