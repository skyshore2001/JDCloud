#!/bin/bash

# 创建一个代码库，允许被远程push，且被push后更新文件夹中内容。

name=$1

if [[ -z $name ]]; then
	echo "Usage: $0 {name}"
	exit 1
fi

if [[ -d $name ]]; then
	echo "!!! git repo $name exists. init it."
else
	git init $name --shared
fi
chmod g+rwxs $name
cd $name

git config receive.denyCurrentBranch ignore
git config receive.denyNonFastForwards false
git config receive.shallowUpdate true
cat <<.  > .git/hooks/post-update
#!/bin/sh
unset GIT_DIR
cd ..
umask 002
git reset --hard

### reload tomcat app, for jd-java project
[[ -d WEB-INF ]] && touch -c WEB-INF/web.xml

### for dev release (no build_web): generate revision file for auto refresh
[[ -d server ]] && git log -1 --format=%H > server/revision.txt
.
chmod a+x .git/hooks/post-update

