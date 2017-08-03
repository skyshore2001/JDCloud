#!/bin/bash

name=$1

if [[ -z $name ]]; then
	echo "Usage: $0 {name}"
	exit 1
fi

git init $name
cd $name
git config receive.denyCurrentBranch ignore
echo "unset GIT_DIR; cd ..; git reset --hard" > .git/hooks/post-update
chmod a+x .git/hooks/post-update

