#!/bin/sh

# 根据模板工程创建新工程，master分支不包含模板工程的提交日志。
# 生成的master0分支用于合并模板工程的最新内容。
# master0 -> master: merge --squash
# master -> master0: merge
# origin -> master0: pull

# 如果想使用git_init.sh创建代码库，可以先设置环境变量：
# export GIT_INIT=git_init.sh 
# git_clone.sh jdcloud myprj1

from=$1
to=$2
fromb=$3
tob=$4

if [[ -z $from || -z $to ]]; then
	echo "Usage: git_clone.sh {from} {to} {from-branch?} {to-branch?=master0}"
	exit 1
fi

if [[ -z $tob ]]; then
	tob=master0
fi

# e.g. 1.8 => 180, 2.11 => 211
gitver=$(git --version | perl -ne '/(\d+\.\d+)/ && print $1*100 + $2;')
mergeOpt=
if [[ $gitver -ge 209 ]]; then
	# 该选项于git 2.9及以后要求
	mergeOpt=--allow-unrelated-histories
fi

if [[ -z $GIT_INIT ]]; then
	GIT_INIT='git init'
fi

$GIT_INIT $to
cd $to
git checkout -b $tob
# 如果不是网络地址或绝对地址则添加"../". 绝对地址如 server-pc:src/jdcloud  http://server-pc/git/jdcloud c:/git/jdcloud /git/jdcloud
if [[ $from == *:* || $from == /* ]]; then
	git pull $from $fromb --depth 1
else
	git pull ../$from $fromb --depth 1
fi
initMsg="init from $from $(git log -1 --format=%H)"
git checkout --orphan master
git add .
git commit -m "$initMsg"
git checkout $tob
git merge master $mergeOpt -m 'merge init'
git checkout master

echo "=== Repo '$to' is created. Branch '$tob' is for merging origin."
