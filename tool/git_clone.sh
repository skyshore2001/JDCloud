#!/bin/sh

# 根据模板工程创建新工程，master分支不包含模板工程的提交日志。
# 生成的master0分支用于合并模板工程的最新内容。
# master0 -> master: merge --squash
# master -> master0: merge
# origin -> master0: pull

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

git init $to
cd $to
git checkout -b $tob
git pull ../$from $fromb
git checkout --orphan master
git add .
git commit -m 'init'
git checkout $tob
git merge master $mergeOpt -m 'merge init'
git checkout master

echo "=== Repo '$to' is created. Branch '$tob' is for merging origin."
