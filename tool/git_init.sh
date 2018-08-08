#!/bin/bash

# 创建一个代码库，允许被远程push，且被push后更新文件夹中内容。

name=$1

if [[ -z $name ]]; then
	echo "Usage: $0 {name}"
	exit 1
fi

git init $name
cd $name
git config receive.denyCurrentBranch ignore
cat <<.  > .git/hooks/post-update
#!/bin/sh
unset GIT_DIR
cd ..
umask 002
git reset --hard
# reload tomcat app, for jd-java project
touch -c WEB-INF/web.xml
.
chmod a+x .git/hooks/post-update

