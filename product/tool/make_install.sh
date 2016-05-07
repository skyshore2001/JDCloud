#!/bin/sh
####################
# 调用webcc编译并使用curl上传服务器。必须由build_web.sh调用。
# Exposed env-vars:
# @var OUT_DIR
# @var FTP_PATH
# @var FTP_AUTH
####################

# OUT_DIR=../product-online
# FTP_PATH=ftp://server/path/
# FTP_AUTH=www:hello

if [[ -z $OUT_DIR || -z $FTP_PATH || -z $FTP_AUTH ]]; then
	echo "*** 参数错误!"
	exit
fi

if [[ ! -d $OUT_DIR ]]; then
	echo "*** 文件夹不存在：$OUT_DIR"
	exit
fi

CURL_CMD="curl -s -S -u $FTP_AUTH"
# 共享给perl
export FTP_PATH FTP_AUTH CURL_CMD

tmpfile=/tmp/webcc.tmp
versionUrl=$FTP_PATH/revision_rel.txt

# e.g. "dir1\dir2\name" => "dir1/dir2/name" on windows.
f=`perl -x $0 abs_path`
script="perl -x -f $f"
webcc="php `dirname $f`/webcc.php"

# !!! CALL WEBCC
$webcc server -o $OUT_DIR

lastlog=`git log -1 --oneline | tr \" \'`
echo "=== 最后日志: $lastlog"

# !!! 切换到OUT_DIR
cd $OUT_DIR

change=`git status -s`
if [[ -z $change ]]; then
	echo "=== 没有文件变动!"
else
	echo
	echo "=== 检查到以下文件变动："
	git status -s

	echo
	read -p '=== 确认改动? (y/n) ' a
	if [[ $a != 'y' && $a != 'Y' ]]; then
		echo "!!! 重置输出目录"
		git clean -f
		git reset --hard
		exit
	fi

	# 隐藏windows系统上crlf相关warning:
	if [[ -n $WINDIR ]]; then
		gitconfig="-c core.safecrlf=false"
	fi
	git $gitconfig add .
	git $gitconfig status -s
	git $gitconfig commit -m "$lastlog"
fi

echo
read -p '=== 更新服务器? (y/n) ' a
doUpload=1
if [[ $a != 'y' && $a != 'Y' ]]; then
	doUpload=0
fi

if (( doUpload )) ; then
	ver=`$CURL_CMD $versionUrl`

	while true; do
		if [[ $? -ne 0 || -z $ver ]]; then
			read -p '!!! 输入线上版本号，留空会上传所有文件: ' ver
		fi
		if [[ -z $ver ]]; then
			cmd=`git ls-files | $script getcmd`
		else
			git diff $ver head --name-only --diff-filter=AM > $tmpfile
			if (( $? != 0 )); then
				unset ver
				continue
			fi
			cmd=`$script getcmd < $tmpfile`
			if [[ -z $cmd ]]; then
				echo "=== 服务器已是最新版本."
				exit
			fi
			echo -e "将更新以下文件: \n------"
			cat $tmpfile
			echo -e "------\n"
			read -p '=== 确认更新服务器? (y/n) ' a
			if [[ $a != 'y' && $a != 'Y' ]]; then
				exit
			fi
		fi
		break
	done
	if [[ -z $cmd ]]; then exit ; fi

	#echo $cmd > cmd1.log
	# !!! 更新服务器
	if $cmd; then
		git log -1 --format=%H > $tmpfile
		$CURL_CMD -T "$tmpfile" "$versionUrl"
		echo "=== 上传成功!"
	else
		echo "!!! 出错了(返回值为$?), 请检查!!!"
		exit
	fi
	rm $tmpfile
fi

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
use Cwd 'abs_path';

if ($ARGV[0] eq 'getcmd')
{
	%files = (); # dir=>name
	while (<STDIN>) {
		chomp;
#		s/^..\s+//; # e.g. git status -b: "A  m/images/ui/icon-svcid-1.png"
#		s/.+?->\s+//; # e.g. "R  web/js/app.js -> web/js/app_fw.js"
		$dir = dirname($_);
		$files{$dir} = [] if !exists($files{$dir});
		push @{$files{$dir}}, $_;
	}

	my $url = $ENV{FTP_PATH};
	if (substr($url, -1) ne '/') {
		$url .= '/';
	}
	while (my ($dir, $fs) = each(%files)) {
		if ($dir eq ".") {
			$dir = "";
		}
		else {
			$dir .= "/";
		}
		$cmd .= " -T {" . join(',', @$fs) . "} ${url}${dir}";
	}

	exit unless defined $cmd;
	$fullCmd = "$ENV{CURL_CMD} --ftp-create-dirs $cmd";
	print $fullCmd;
	#open O, ">cmd.log";
	#print O $fullCmd;
	#close O;
}
elsif ($ARGV[0] eq 'abs_path') {
	print abs_path($0);
}
#}}}
# vi: foldmethod=marker
