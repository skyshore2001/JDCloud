#!/bin/sh

# 注意：
# 用户必须有以下权限：
# grant select, lock tables, show view on carsvc.* to xeycro;
# grant select on mysql.* to xeycro;
# grant reload, replication client, replication slave on *.* to xeycro;

dbuser=xeycro
dbpwd=xeyc2014
db=carsvc

bak=bak/db_`date +%Y%m%d_%H%M%S`.gz

mysqldump -u$dbuser -p$dbpwd --routines $db --master-data=2 --ignore-table=${db}.ApiLog | gzip > $bak

echo "=== db backup to file '$bak'"

cd bak
for f in db_*.gz ; do
	if [[ $f < db_`date -d '-10 day' +%Y%m%d`.gz ]]; then
		rm -f $f
	fi
done

