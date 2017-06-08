#!/bin/sh
:<<'*/'
/**
@module jdcloud-build

筋斗云框架上线部署工具。支持ftp/git两种方式部署。

使用本工具步骤：

- Web应用项目名为jdcloud，要求使用git进行版本控制。
- 创建发布版本库(又称online版本库), 使用git管理，定名称为 jdcloud-online:

		git init jdcloud-online

- 在线上服务器上设置ftp帐号或git帐号。如果使用git发布，参考下面设置线上发布目录：

		cd path/to
		# 创建应用目录为jdcloud, 同时也是online版本库的一个分支
		git init jdcloud  
		cd jdcloud
		# 允许远端push并执行自动更新
		git config receive.denyCurrentBranch ignore
		echo "unset GIT_DIR; cd ..; git reset --hard" > .git/hooks/post-update
		chmod a+x .git/hooks/post-update

- 一般编写`build_web.sh`脚本，其中设置并调用jdcloud-build，上线时直接运行它即可：

		build_web.sh

	在Windows平台上，建议在git shell中运行，或已设置.sh文件使用git shell打开执行。

要求相关工具：

- git (版本管理)
- php/webcc (生成web发布目录)
- curl (ftp自动上传工具，一般在git工具包中已包含)

使用FTP上线，编写build_web.sh如下：

	export OUT_DIR=../product-online
	export FTP_PATH=ftp://server/path/
	export FTP_AUTH=www:hello
	tool/jdcloud-build.sh

使用git上线：

	export OUT_DIR=../product-online
	export GIT_PATH=user@server:path/jdcloud
	tool/jdcloud-build.sh

在上线时要求输入密码，可以通过设置ssh证书签名方式免密登录。

如果同时设置了GIT_PATH与FTP_PATH，会优先使用git方式上线。

通过环境变量向jdcloud-build脚本传参数，可用变量如下所述。

@var OUT_DIR

必须指定。
输出目录，即发布版本库的目录，一般起名为`{project}-online`.

@var FTP_PATH
@var FTP_AUTH

使用ftp上线时，指定线上地址，如`ftp://server/path`。FTP_AUTH格式为`{user}:{pwd}`.

@var GIT_PATH

使用git上线时，指定线上版本库地址。如 `GIT_PATH=user@server:path/jdcloud`

@var CHECK_BRANCH

online版本库可以使用多分支，每个分支对应一个线上地址。
如果指定分支，则要求在上线时online版本库分支与指定相同，否则出错。

@var CFG_PLUGINS

如果指定，则plugin文件夹下只上传指定的插件，plugin/index.php和未指定的插件均不上传，例：

	CFG_PLUGINS=plugin1,plugin2

*/

#### global
CURL_CMD="curl -s -S -u $FTP_AUTH -k "

# e.g. "dir1\dir2\name" => "dir1/dir2/name" on windows.
PROG=`perl -x $0 abs_path`
TOOL="perl -x -f $PROG"

#### functions
function buildWeb
{
	webcc_cmd="php `dirname $PROG`/webcc.php"
	# !!! CALL WEBCC
	$webcc_cmd server -o $OUT_DIR || exit

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
			git clean -fd
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
}

function deployViaFtp
{
	versionUrl=$FTP_PATH/revision_rel.txt
	ver=`$CURL_CMD $versionUrl`
	tmpfile=/tmp/webcc.tmp

	while true; do
		if [[ $? -ne 0 || -z $ver ]]; then
			read -p '!!! 输入线上版本号，留空会上传所有文件: ' ver
		fi
		if [[ -z $ver ]]; then
			cmd=$(git ls-files | $TOOL getcmd) || exit
		else
			if [[ -z $CFG_PLUGINS ]]; then
				git diff $ver head --name-only --diff-filter=AM > $tmpfile
			else
				git diff $ver head --name-only --diff-filter=AM | $TOOL filter > $tmpfile
			fi
			if (( $? != 0 )); then
				unset ver
				continue
			fi
			cmd=$($TOOL getcmd < $tmpfile) || exit
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
}

function deployWeb
{
	echo
	read -p '=== 更新服务器? (y/n) ' a
	doUpload=1
	if [[ $a != 'y' && $a != 'Y' ]]; then
		doUpload=0
	fi

	if (( doUpload )) ; then
		if [[ -n $GIT_PATH ]]; then
			git push $GIT_PATH
		else
			deployViaFtp
		fi
	fi
}

function pushGit
{
	echo
	read -p '=== 推送到代码库? (y/n) ' a
	if [[ $a == 'y' || $a == 'Y' ]]; then
		git push -u origin master
	fi
}

#### main

# 共享给perl
export FTP_PATH FTP_AUTH CURL_CMD

if [[ -z $OUT_DIR || (-z $GIT_PATH && (-z $FTP_PATH || -z $FTP_AUTH)) ]]; then
	echo "*** 参数错误!"
	exit
fi

if [[ ! -d $OUT_DIR ]]; then
	echo "*** 文件夹不存在：$OUT_DIR"
	exit
fi

if [[ -n $CHECK_BRANCH ]]; then
	branch=$(cd $OUT_DIR && git status -b | perl -ne '/On branch (\w+)/ && print $1;')
	if [[ $branch != $CHECK_BRANCH ]]; then
		echo "*** branch mismatch: require '$CHECK_BRANCH', but actual on '$branch'";
		exit
	fi
fi

buildWeb || exit
deployWeb || exit
pushGit

exit
################# perl cmd {{{
#!perl

=pod
test:

echo -e "m2/index.html\nm2/index.js" | perl -x -f jdcloud-build.sh getcmd

export CFG_PLUGINS=plugin1,plugin2
echo -e "plugin/index.php\nplugin/plugin1/aa\nplugin/plugin3/bb\n" | perl -x -f jdcloud-build.sh filter

=cut

use strict;
use warnings;
use File::Basename;
use Cwd 'abs_path';

if ($ARGV[0] eq 'getcmd')
{
	my %files = (); # dir=>name
	my @badfiles = ();

	while (<STDIN>) {
		chomp;
		if (/\s/) {
			push @badfiles, $_;
			next;
		}
#		s/^..\s+//; # e.g. git status -b: "A  m/images/ui/icon-svcid-1.png"
#		s/.+?->\s+//; # e.g. "R  web/js/app.js -> web/js/app_fw.js"
		my $dir = dirname($_);
		$files{$dir} = [] if !exists($files{$dir});
		push @{$files{$dir}}, $_;
	}
	if (@badfiles) {
		print STDERR "*** bad filename:\n" . join("\n", @badfiles) . "\n";
		exit 1;
	}

	my $url = $ENV{FTP_PATH} || '';
	my $cmd;
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
	my $curl = $ENV{CURL_CMD} || 'curl';
	my $fullCmd = "$curl --ftp-create-dirs $cmd";
	print $fullCmd;
	#open O, ">cmd.log";
	#print O $fullCmd;
	#close O;
}
elsif ($ARGV[0] eq 'abs_path') {
	print abs_path($0);
}
elsif ($ARGV[0] eq 'filter') {
	my @wants = ('.htaccess');
	if ($ENV{CFG_PLUGINS}) {
		for (split(',', $ENV{CFG_PLUGINS})) {
			push @wants, 'plugin/' . $_ . '/';
		}
	}

	while (<STDIN>) {
		my $ignore = 0;
		if (index($_, 'plugin/') == 0) {
			$ignore = 1;
			foreach my $pat (@wants) {
				if (index($_, $pat) == 0) {
					$ignore = 0;
					last;
				}
			}
		}
		next if $ignore;
		print;
	}
}
#}}}
# vi: foldmethod=marker
